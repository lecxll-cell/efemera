'use strict';
const { iso, parseISO, midnight, addDays, diffDays, hhmmToMin, minutesOf, fmtShort } = require('./dates');
const { plan, occurrencesFrom, recentPast, estadoOf, reativacao, FREQUENCIAS, anosDeAniversario } = require('./schedule');
const { build } = require('./compose');

const BACKOFF_MIN = [1, 2, 5, 10, 15, 30, 60], MAX_ATTEMPTS = 40; // ~2 dias de tentativas antes de dar como falhado
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

class Engine {
  // transport: () => { send(msg) } (obtido de cada vez)
  constructor({ store, transport, notify = () => {}, now = () => new Date() }) { Object.assign(this, { store, getTransport: transport, notify, now }); this.busy = false; }
  get d() { return this.store.data; }
  // Uma efeméride só gera avisos se estiver «Ativo». «Em hibernação» pára os avisos até ao ano seguinte; «Suspenso» pára-os indefinidamente.
  isActive(ef) { const e = estadoOf(ef); return e === 'ativo' || (e === 'hibernacao' && this.d.config.permitir_hibernacao === false); }

  start() { // arranque da app: regista o intervalo em que a app esteve parada
    const prev = this.d.estado.ultimaVerificacao, n = this.now();
    if (prev && (n - new Date(prev)) > 36 * 36e5) this.store.log('sistema', `A aplicação esteve inativa desde ${fmtShort(new Date(prev))}. Foram recuperados os avisos em atraso.`);
    this.d.estado.ultimoArranque = n.toISOString(); this.store.save();
  }

  setEstado(id, estado) {
    const ef = this.d.efemerides.find(e => e.id === id); if (!ef) throw new Error('Efeméride não encontrada.');
    if (!['ativo', 'hibernacao', 'suspenso'].includes(estado)) throw new Error('Estado inválido.');
    if (estado === 'hibernacao') {
      if (this.d.config.permitir_hibernacao === false) throw new Error('A hibernação está desativada nas Definições.');
      if (!parseISO(ef.data)) throw new Error('A efeméride não tem data: não há ciclo para adormecer.');
      const O = occurrencesFrom(ef.data, midnight(this.now()))[0]; ef.hibernacao = { ciclo: iso(O) }; ef.estado = 'hibernacao';
      this.store.log('sistema', `«${ef.titulo}» em hibernação: sem avisos até ${fmtShort(reativacao(ef, this.d.config))}.`);
    } else { ef.estado = estado; ef.hibernacao = null; if (estado === 'ativo') ef.desde = iso(midnight(this.now())); this.store.log('sistema', `«${ef.titulo}»: ${estado === 'suspenso' ? 'suspensa indefinidamente' : 'ativa'}.`); }
    this.store.save();
  }
  _wake(today) { // hibernação termina sozinha quando abre a janela do ano seguinte
    if (this.d.config.permitir_hibernacao === false) return;
    for (const ef of this.d.efemerides) {
      if (estadoOf(ef) !== 'hibernacao') continue;
      const r = reativacao(ef, this.d.config);
      if (!r || !parseISO(ef.data)) { ef.estado = 'ativo'; ef.hibernacao = null; continue; }
      if (today >= r) { ef.estado = 'ativo'; ef.hibernacao = null; ef.desde = iso(r); const msg = `«${ef.titulo}» saiu da hibernação e volta a ser notificada.`; this.store.log('sistema', msg); this.notify('EFÉMERA — efeméride reativada', msg); }
    }
  }

  // Idempotente e seguro de repetir a qualquer momento (de minuto a minuto, ao acordar o PC, ao abrir a app).
  async check() {
    if (this.busy) return; this.busy = true;
    try {
      const now = this.now(), today = midnight(now), cfg = this.d.config;
      this._limpezaAnual(today); this._wake(today);
      if (minutesOf(now) >= hhmmToMin(cfg.hora)) { const due = this._due(today, cfg); if (due.length) this._enqueue(due, now); }
      this._detectLost(today, cfg);
      // Carimbo da última verificação: só é persistido de hora a hora, para não forçar uma gravação a cada minuto quando nada mudou.
      const ult = this.d.estado.ultimaVerificacao;
      if (!ult || (now - new Date(ult)) >= 36e5) this.d.estado.ultimaVerificacao = now.toISOString();
      this.store.save();
      await this.processOutbox();
    } finally { this.busy = false; }
  }

  // «desde»: só contam como falhados os avisos a partir do dia em que a efeméride (ou o seu calendário) ficou ativa.
  _due(today, cfg) {
    const out = [];
    for (const ef of this.d.efemerides) {
      if (!this.isActive(ef) || !parseISO(ef.data)) continue;
      const desde = parseISO(ef.desde);
      for (const O of occurrencesFrom(ef.data, today)) {
        const p = plan(ef, cfg, O); if (!p.days.length) continue;
        const k = d => `${ef.id}|${iso(O)}|${iso(d)}`, past = p.days.filter(d => d < today && (!desde || d >= desde) && !this.d.enviados[k(d)]);
        const idx = p.days.findIndex(d => diffDays(d, today) === 0);
        const base = { ef, O, dias: diffDays(O, today), anos: anosDeAniversario(ef.data, O.getFullYear()), frequencia: FREQUENCIAS[p.f], proximo: p.days.find(d => d > today) || null };
        if (idx >= 0 && !this.d.enviados[k(today)]) out.push({ ...base, kind: 'diario', keys: [k(today), ...past.map(k)], atrasados: past, aviso: { n: idx + 1, total: p.days.length } });
        else if (idx < 0 && past.length && today <= O) out.push({ ...base, kind: 'atraso', keys: [`${ef.id}|${iso(O)}|atraso|${iso(today)}`, ...past.map(k)], atrasados: past });
      }
    }
    return out;
  }

  // Princípio: um só e-mail com todos os alertas desse dia (se houver uma só efeméride, só essa).
  _enqueue(due, now) {
    const cfg = this.d.config, m = build({ items: due, cfg, now, efemerides: this.d.efemerides }), id = uid(), criado = now.toISOString();
    this.d.outbox.push({ id, to: cfg.destinatario ? [cfg.destinatario] : [], subject: m.subject, html: m.html, criado, tentativas: 0, proxima: criado, estado: 'pendente', erro: '', efs: due.map(i => i.ef.id), chaves: due.flatMap(i => i.keys) });
    due.forEach(i => i.keys.forEach(k => { this.d.enviados[k] = { criado, outbox: id }; })); // registado ANTES de enviar → nunca duplica
    this.store.log('aviso', `Aviso criado: ${due.map(i => i.ef.titulo).join('; ')}`);
    this.notify('EFÉMERA — efemérides a assinalar', due.map(i => `${i.ef.titulo} (${i.dias <= 0 ? 'hoje' : i.dias + ' dias'})`).join('\n'));
  }

  _detectLost(today, cfg) { // período de avisos que acabou sem nenhum aviso (PC desligado) e a data já passou
    for (const ef of this.d.efemerides) {
      if (!this.isActive(ef) || !parseISO(ef.data)) continue;
      const desde = parseISO(ef.desde);
      for (const O of recentPast(ef.data, today)) {
        const pre = `${ef.id}|${iso(O)}|`, key = pre + 'perdido';
        if (this.d.enviados[key] || !plan(ef, cfg, O).days.some(d => !desde || d >= desde)) continue;
        this.d.enviados[key] = { criado: this.now().toISOString() };
        if (!Object.keys(this.d.enviados).some(k => k.startsWith(pre) && k !== key)) {
          const msg = `Não foi enviado nenhum aviso de «${ef.titulo}» (${fmtShort(O)}): a aplicação não esteve ativa durante o período dos avisos.`;
          this.store.log('perdido', msg);
        }
      }
    }
  }

  // Todos os anos limpa o histórico dos avisos (registo, e-mails enviados, ciclos já celebrados). As efemérides ficam.
  _limpezaAnual(today) {
    const ano = today.getFullYear(), est = this.d.estado;
    if (est.limpezaAno === ano) return;
    if (est.limpezaAno) {
      this.d.historico = []; this.d.outbox = this.d.outbox.filter(i => i.estado !== 'enviado');
      const lim = addDays(today, -45); // mantém os ciclos recentes, para não os voltar a assinalar como perdidos
      for (const k of Object.keys(this.d.enviados)) { const o = parseISO(k.split('|')[1]); if (o && o < lim) delete this.d.enviados[k]; }
      this.store.log('sistema', `Histórico de avisos de ${ano - 1} limpo.`);
    }
    est.limpezaAno = ano;
  }

  async processOutbox() {
    const now = this.now(), tr = this.getTransport();
    for (const it of this.d.outbox) {
      if (it.estado !== 'pendente' || new Date(it.proxima) > now) continue;
      try {
        if (!it.to.length) throw new Error('Indique o seu e-mail nas Definições (Destinatário).');
        await tr.send({ to: it.to, subject: it.subject, html: it.html });
        it.estado = 'enviado'; it.enviadoEm = this.now().toISOString(); it.erro = ''; it.html = ''; this.d.estado.ultimoEnvio = it.enviadoEm;
        this.store.log('envio', `E-mail enviado para ${it.to.join(', ')}: ${it.subject}`);
      } catch (e) {
        it.tentativas++; it.erro = String(e.message || e);
        if (it.tentativas >= MAX_ATTEMPTS) { it.estado = 'falhou'; this.store.log('falha', `O e-mail «${it.subject}» não foi enviado após ${it.tentativas} tentativas: ${it.erro}`); this.notify('EFÉMERA — e-mail NÃO enviado', `${it.subject}\n${it.erro}`); }
        else {
          const wait = it.tentativas <= 7 ? BACKOFF_MIN[it.tentativas - 1] : it.tentativas <= 24 ? 60 : 120;
          it.proxima = new Date(now.getTime() + wait * 6e4).toISOString();
          if (it.tentativas === 3) this.notify('EFÉMERA — problema no envio de e-mail', `${it.erro}\nA tentar novamente automaticamente.`);
        }
      }
      this.store.save();
    }
  }

  retry(id) { const it = this.d.outbox.find(i => i.id === id); if (it) { it.estado = 'pendente'; it.tentativas = 0; it.proxima = this.now().toISOString(); this.store.save(); } return this.check(); }
  async sendTest() {
    const cfg = this.d.config; if (!cfg.destinatario) throw new Error('Indique o seu e-mail nas Definições (Destinatário).');
    await this.getTransport().send({ to: [cfg.destinatario], subject: '[EFÉMERA] E-mail de teste', html: '<p>Se recebeu esta mensagem, o envio de avisos está a funcionar neste computador.</p>' });
    this.store.log('envio', 'E-mail de teste enviado.'); this.store.save(); return true;
  }

  // Agenda: o período de avisos de cada efeméride ativa e ciclo (início, data, n.º de e-mails, frequência, próximo aviso e anos de aniversário).
  janelas(horizon = 120) {
    const today = midnight(this.now()), end = addDays(today, horizon), cfg = this.d.config, out = [];
    for (const ef of this.d.efemerides) {
      if (!this.isActive(ef) || !parseISO(ef.data)) continue;
      for (const O of occurrencesFrom(ef.data, today)) {
        const p = plan(ef, cfg, O), proximo = p.days.find(d => d >= today);
        if (proximo && p.start <= end) out.push({ id: ef.id, titulo: ef.titulo, data: iso(O), inicio: iso(p.start), total: p.days.length, frequencia: FREQUENCIAS[p.f], proximo: iso(proximo), emCurso: p.start <= today, anos: anosDeAniversario(ef.data, O.getFullYear()) });
      }
    }
    return out.sort((a, b) => a.inicio.localeCompare(b.inicio));
  }

  // Último e-mail de cada efeméride (para o separador Estado).
  ultimoEmail(efId) { return this.d.outbox.filter(i => (i.efs || (i.chaves || []).map(c => c.split('|')[0])).includes(efId)).sort((a, b) => a.criado.localeCompare(b.criado)).pop() || null; }

  health() {
    const d = this.d, cfg = d.config, probs = [], now = this.now();
    const semData = d.efemerides.filter(e => estadoOf(e) === 'ativo' && !parseISO(e.data)).length;
    const pend = d.outbox.filter(i => i.estado === 'pendente'), falh = d.outbox.filter(i => i.estado === 'falhou');
    if (!cfg.destinatario) probs.push({ nivel: 'erro', msg: 'Falta indicar o seu e-mail (Definições → Destinatário): não serão enviados avisos.' });
    if (falh.length) probs.push({ nivel: 'erro', msg: `${falh.length} e-mail(s) não foram enviados. Veja o separador Estado.` });
    if (pend.some(i => i.tentativas > 0)) probs.push({ nivel: 'aviso', msg: `${pend.filter(i => i.tentativas > 0).length} e-mail(s) com envio em repetição: ${pend.find(i => i.tentativas > 0).erro}` });
    if (semData) probs.push({ nivel: 'aviso', msg: `${semData} efeméride(s) sem data: não geram avisos.` });
    const perdidos = d.historico.filter(h => h.tipo === 'perdido' && h.ts > addDays(now, -30).toISOString()).length;
    if (perdidos) probs.push({ nivel: 'aviso', msg: `${perdidos} período(s) de avisos perdido(s) por a aplicação estar inativa.` });
    if (d.estado.ultimaVerificacao && (now - new Date(d.estado.ultimaVerificacao)) > 36 * 36e5) probs.push({ nivel: 'aviso', msg: 'A última verificação foi há mais de 36 horas.' });
    return { problemas: probs, ok: !probs.some(p => p.nivel === 'erro'), ultimaVerificacao: d.estado.ultimaVerificacao, ultimoEnvio: d.estado.ultimoEnvio, recuperado: this.store.recovered };
  }
}
module.exports = { Engine, MAX_ATTEMPTS };
