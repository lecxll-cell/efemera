'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const { setup } = require('./helpers'); const { plan, validate, estadoOf, ESTADOS, FREQUENCIAS, reativacao, anosDeAniversario } = require('../src/engine/schedule');
const { occurrence, iso, addDays, diffDays } = require('../src/engine/dates'); const { MAX_ATTEMPTS } = require('../src/engine/engine'); const { TIPOS } = require('../src/engine/types'); const { Store } = require('../src/engine/store');
const O = new Date(2027, 4, 18), ds = f => plan({ frequencia: f }, { antecedencia: 90, frequencia: 'semanal' }, O).days.map(iso);
const txt = m => m.html.replace(/<br>/g, '\n').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"');
const days = async (s, from, to, hour = 9) => { const out = []; for (let t = new Date(from); t <= to; t = addDays(t, 1)) { s.at(t.getFullYear(), t.getMonth() + 1, t.getDate(), hour); const b = s.sent.length; await s.engine.check(); if (s.sent.length > b) out.push(iso(t)); } return out; };

// ---- Frequências (período: de data − antecedência até à data)
test('frequências: cada uma gera os dias certos entre 17/02 e 18/05 (90 dias antes)', () => {
  assert.deepEqual(Object.keys(FREQUENCIAS), ['diarios', 'dias-semana', 'alternados', 'semanal', 'quinzenal', 'mensal']);
  assert.equal(ds('diarios').length, 91);
  const dias = ds('dias-semana'); assert.ok(dias.every(d => { const w = new Date(d + 'T00:00').getDay(); return w >= 1 && w <= 5; })); assert.equal(dias.length, 65);
  const alt = ds('alternados'); assert.equal(alt.length, 46); assert.deepEqual(alt.slice(0, 2), ['2027-02-17', '2027-02-19']);
  const sem = ds('semanal'); assert.equal(sem.length, 13); assert.equal(sem[12], '2027-05-12'); sem.slice(1).forEach((d, i) => assert.equal(diffDays(new Date(d + 'T00:00'), new Date(sem[i] + 'T00:00')), 7));
  assert.deepEqual(ds('quinzenal'), ['2027-02-17', '2027-03-04', '2027-03-19', '2027-04-03', '2027-04-18', '2027-05-03', '2027-05-18']);
  assert.deepEqual(ds('mensal'), ['2027-02-17', '2027-03-17', '2027-04-17', '2027-05-17']);
});
test('«De mês a mês» respeita meses curtos (início a 31)', () => {
  const p = plan({ frequencia: 'mensal', antecedencia: 120 }, { antecedencia: 90 }, new Date(2027, 4, 31)); assert.deepEqual(p.days.map(iso), ['2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30', '2027-05-31']);
});
test('só avisa nos dias previstos (predefinição: semana a semana) e a partir da hora definida', async () => {
  const s = setup(); s.add('1950-05-18');
  assert.deepEqual(await days(s, new Date(2027, 1, 10), new Date(2027, 2, 12)), ['2027-02-17', '2027-02-24', '2027-03-03', '2027-03-10']);
  const t = setup(); t.add('1950-05-18'); t.at(2027, 2, 17, 8, 59); await t.engine.check(); assert.equal(t.sent.length, 0); t.at(2027, 2, 17, 9, 0); await t.engine.check(); t.at(2027, 2, 17, 15); await t.engine.check(); assert.equal(t.sent.length, 1);
});
test('a frequência e a antecedência de uma efeméride sobrepõem-se às predefinidas', async () => {
  let s = setup(); s.add('1950-05-18', { frequencia: 'quinzenal' }); assert.deepEqual(await days(s, new Date(2027, 1, 10), new Date(2027, 2, 10)), ['2027-02-17', '2027-03-04']);
  s = setup({ cfg: { frequencia: 'diarios' } }); s.add('1950-05-18', { antecedencia: 120 }); assert.deepEqual(await days(s, new Date(2027, 0, 15), new Date(2027, 0, 20)), ['2027-01-18', '2027-01-19', '2027-01-20']);
});
test('antecedência mínima: 90 dias (valores abaixo são recusados)', () => { assert.ok(validate(89)); assert.ok(validate(60)); assert.equal(validate(90), ''); assert.ok(validate(400)); });
test('vários avisos no mesmo dia: um só e-mail com todos; se for só uma efeméride, só essa', async () => {
  let s = setup({ cfg: { frequencia: 'diarios' } }); ['1950-05-18', '1960-05-19', '1970-05-20'].forEach(d => s.add(d)); s.at(2027, 2, 20); await s.engine.check();
  assert.equal(s.sent.length, 1); assert.match(s.sent[0].subject, /3 efemérides a preparar/); assert.match(txt(s.sent[0]), /1\. Efeméride[\s\S]*2\. Efeméride[\s\S]*3\. Efeméride/);
  s = setup({ cfg: { frequencia: 'diarios' } }); s.add('1950-05-18'); s.add('1960-12-25'); s.at(2027, 2, 20); await s.engine.check(); assert.equal(s.sent.length, 1); assert.match(s.sent[0].subject, /^\[EFÉMERA\] Faltam 87 dias: «Efeméride 1»/); assert.doesNotMatch(txt(s.sent[0]).split('Anuário')[0], /Efeméride 2/);
});
test('o e-mail traz data, dias, tipo, anos de aniversário, n.º do aviso e próximo aviso; destinatário único; sem estado/publicação', async () => {
  const s = setup(); s.add('1927-05-18', { titulo: 'Dia Internacional dos Museus', tipo: 'dias' }); s.at(2027, 2, 17); await s.engine.check();
  const m = s.sent[0]; assert.match(m.subject, /Faltam 90 dias: «Dia Internacional dos Museus» \(18 de maio\) · 100 anos \(centenário\)/); assert.deepEqual(m.to, ['ana@cm-mirandela.pt']);
  assert.match(txt(m), /Tipo: Dias nacionais e internacionais/); assert.match(txt(m), /Anos de aniversário: 100 anos \(centenário\)/); assert.match(txt(m), /Aviso: 1 de 13 · Semana a semana/); assert.match(txt(m), /Próximo aviso: 24\/02\/2027/);
  assert.doesNotMatch(txt(m), /Estado|Publicação|Completo|imagem/); assert.equal('cc' in m, false);
});
test('anos de aniversário: marcos (múltiplos de 25), nomes e casos limite', () => {
  assert.deepEqual(anosDeAniversario('1927-05-18', 2027), { n: 100, marco: true, nome: 'centenário', texto: '100 anos (centenário)' }); assert.equal(anosDeAniversario('1977-05-18', 2027).texto, '50 anos (cinquentenário)');
  assert.equal(anosDeAniversario('2026-05-18', 2027).texto, '1 ano'); assert.equal(anosDeAniversario('1900-01-01', 2027).marco, false); assert.equal(anosDeAniversario('1952-01-01', 2027).texto, '75 anos (aniversário redondo)');
  assert.equal(anosDeAniversario('1877-01-01', 2027).texto, '150 anos (sesquicentenário)'); assert.equal(anosDeAniversario('2027-01-01', 2027), null); assert.equal(anosDeAniversario('2030-01-01', 2027), null);
});
test('tipos: lista pedida', () => {
  assert.deepEqual(TIPOS.map(t => t.nome), ['Acontecimentos históricos', 'Dias nacionais e internacionais', 'Distinções e condecorações', 'Documentos históricos', 'Encontros, palestras e jornadas', 'Inscrições e Categorias de classificação', 'Instituições e coletividades', 'Pessoas', 'Práticas rituais, sociais e eventos festivos', 'Outro']);
});

// ---- Computador desligado
test('PC desligado num dia de aviso: o aviso previsto seguinte indica o dia em falta', async () => {
  const s = setup(); s.add('1950-05-18'); s.at(2027, 2, 17); await s.engine.check(); s.at(2027, 3, 3); await s.engine.check();
  assert.equal(s.sent.length, 2); assert.match(txt(s.sent[1]), /Não foi possível avisar em: 24\/02\/2027/); s.at(2027, 3, 10); await s.engine.check(); assert.doesNotMatch(txt(s.sent[2]), /Não foi possível avisar/);
});
test('PC desligado e ligado num dia sem aviso previsto: um aviso em atraso, uma só vez por falha', async () => {
  const s = setup(); s.add('1950-05-18'); s.at(2027, 2, 17); await s.engine.check(); s.at(2027, 3, 2); await s.engine.check();
  assert.equal(s.sent.length, 2); assert.match(s.sent[1].subject, /Aviso em atraso/); assert.match(txt(s.sent[1]), /24\/02\/2027/);
  s.at(2027, 3, 2, 18); await s.engine.check(); s.at(2027, 3, 3); await s.engine.check(); assert.equal(s.sent.length, 3); assert.doesNotMatch(txt(s.sent[2]), /Não foi possível/);
});
test('muitos avisos em falta: a lista resume (primeiro … último e total)', async () => {
  const s = setup(); s.add('1950-05-18'); s.at(2027, 3, 20); await s.engine.check(); assert.equal(s.sent.length, 1); assert.match(txt(s.sent[0]), /17\/02\/2027 … 17\/03\/2027 \(5 avisos\)/);
  s.at(2027, 3, 21); await s.engine.check(); assert.equal(s.sent.length, 1);
});
test('efeméride criada a meio do período: o passado não conta como falhado («desde»)', async () => {
  const s = setup(); s.add('1950-05-18', { desde: '2027-03-20' }); s.at(2027, 3, 20); await s.engine.check(); assert.equal(s.sent.length, 0); s.at(2027, 3, 24); await s.engine.check(); assert.equal(s.sent.length, 1); assert.doesNotMatch(txt(s.sent[0]), /Não foi possível/);
});
test('PC desligado até depois da data: não envia, regista aviso perdido uma só vez', async () => {
  const s = setup(); s.add('1950-05-18'); s.at(2027, 5, 25); await s.engine.check(); await s.engine.check();
  assert.equal(s.sent.length, 0); assert.equal(s.store.data.historico.filter(h => h.tipo === 'perdido').length, 1); assert.ok(s.engine.health().problemas.some(p => /perdido/.test(p.msg)));
  s.at(2027, 7, 1); await s.engine.check(); assert.ok(!s.engine.health().problemas.some(p => /perdido/.test(p.msg)));
});

// ---- Envio
test('falha de envio (Outlook): repete com intervalos, não duplica e entrega quando volta', async () => {
  const s = setup(); s.add('1950-05-18'); s.tx.fail = 3; s.at(2027, 2, 17, 9, 0); await s.engine.check();
  assert.equal(s.sent.length, 0); assert.equal(s.store.data.outbox[0].tentativas, 1); s.at(2027, 2, 17, 9, 0); await s.engine.check(); assert.equal(s.tx.calls, 1);
  for (let m = 1; m <= 12; m++) { s.at(2027, 2, 17, 9, m); await s.engine.check(); }
  assert.equal(s.sent.length, 1); assert.equal(s.store.data.outbox.filter(i => i.estado === 'enviado').length, 1); assert.ok(s.notes.some(n => /problema no envio/.test(n[0])));
});
test('depois de muitas falhas fica "falhou", notifica e pode ser reenviado', async () => {
  const s = setup(); s.add('1950-05-18'); s.tx.fail = 9999; s.at(2027, 2, 17); await s.engine.check();
  for (let i = 0; i < MAX_ATTEMPTS + 2; i++) { s.clock.t = new Date(s.clock.t.getTime() + 125 * 6e4); await s.engine.check(); }
  const it = s.store.data.outbox[0]; assert.equal(it.estado, 'falhou'); assert.ok(s.notes.some(n => /NÃO enviado/.test(n[0]))); assert.equal(s.engine.health().ok, false);
  s.tx.fail = 0; await s.engine.retry(it.id); assert.equal(s.sent.length, 1); assert.equal(it.estado, 'enviado');
});
test('reiniciar a aplicação não repete avisos; crash entre criar e enviar envia uma só vez', async () => {
  let s = setup(); s.add('1950-05-18'); s.at(2027, 2, 17); await s.engine.check(); await s.reopen().check(); assert.equal(s.sent.length, 1);
  s = setup(); s.add('1950-05-18'); s.at(2027, 2, 17); s.tx.fail = 1; await s.engine.check(); s.at(2027, 2, 17, 9, 2); await s.reopen().check(); assert.equal(s.sent.length, 1);
});
test('sem destinatário o aviso não se perde: fica pendente (alerta vermelho) e sai quando indicar o e-mail', async () => {
  const s = setup({ cfg: { destinatario: '' } }); s.add('1950-05-18'); s.at(2027, 2, 17); await s.engine.check(); assert.equal(s.sent.length, 0); assert.equal(s.engine.health().ok, false);
  s.store.data.outbox[0].to = ['ana@cm-mirandela.pt']; s.clock.t = new Date(s.clock.t.getTime() + 125 * 6e4); await s.engine.check(); assert.equal(s.sent.length, 1);
});

// ---- Calendário
test('recorrência anual; 29 de fevereiro cai a 28 nos anos comuns; horas de verão', async () => {
  const s = setup(); s.add('1950-05-18'); const n = []; for (const [y, d] of [[2027, 17], [2028, 18]]) { s.at(y, 2, d); const b = s.sent.length; await s.engine.check(); n.push(s.sent.length - b); } assert.deepEqual(n, [1, 1]);
  assert.equal(iso(occurrence('1996-02-29', 2027)), '2027-02-28'); assert.equal(iso(occurrence('1996-02-29', 2028)), '2028-02-29');
  const p = plan({ frequencia: 'diarios' }, { antecedencia: 90 }, new Date(2027, 3, 2)); assert.equal(p.days.length, 91); p.days.slice(1).forEach((d, i) => assert.equal(diffDays(d, p.days[i]), 1));
});
test('sem data não avisa e aparece como problema; datas impossíveis são ignoradas', async () => {
  const s = setup(); s.add(''); s.add('2027-02-31'); s.at(2027, 2, 17); await s.engine.check(); assert.equal(s.sent.length, 0); assert.ok(s.engine.health().problemas.some(p => /sem data/.test(p.msg)));
});
test('agenda (janelas): só efemérides «Ativo», com início, data, n.º de e-mails, frequência, próximo aviso e anos', () => {
  const s = setup(); s.add('1927-05-18'); s.add('1960-05-18', { estado: 'hibernacao', hibernacao: { ciclo: '2027-05-18' } }); s.add('1970-05-18', { estado: 'suspenso' }); s.at(2027, 2, 10);
  let a = s.engine.janelas(120); assert.equal(a.length, 1); assert.deepEqual([a[0].inicio, a[0].data, a[0].total, a[0].frequencia, a[0].proximo, a[0].emCurso, a[0].anos.n], ['2027-02-17', '2027-05-18', 13, 'Semana a semana', '2027-02-17', false, 100]);
  s.at(2027, 2, 20); a = s.engine.janelas(120); assert.deepEqual([a[0].proximo, a[0].emCurso], ['2027-02-24', true]); s.at(2027, 5, 19); assert.equal(s.engine.janelas(120).length, 0);
});

// ---- Estados e hibernação
test('estados: textos exatos', () => { assert.deepEqual(ESTADOS, { ativo: 'Ativo (saído da hibernação, deverá começar a ser notificado)', hibernacao: 'Ativo (em hibernação)', suspenso: 'Suspenso (indefinidamente)' }); assert.equal(estadoOf({}), 'ativo'); });
test('hibernar: sem avisos este ano; reativa sozinha a 90 dias da data do ano seguinte e volta a avisar', async () => {
  const s = setup(); const ef = s.add('1950-05-18'); s.at(2027, 2, 10); s.engine.setEstado(ef.id, 'hibernacao'); assert.equal(iso(reativacao(ef, s.store.data.config)), '2028-02-18');
  assert.deepEqual(await days(s, new Date(2027, 1, 10), new Date(2027, 5, 1)), []); assert.deepEqual(await days(s, new Date(2027, 11, 1), new Date(2028, 1, 17)), []);
  s.at(2028, 2, 18); await s.engine.check(); assert.equal(ef.estado, 'ativo'); assert.equal(s.sent.length, 1); assert.match(txt(s.sent[0]), /Aviso: 1 de 13/); assert.ok(s.notes.some(n => /reativada/.test(n[0]))); assert.ok(s.store.data.historico.some(h => /saiu da hibernação/.test(h.msg)));
});
test('"e assim sucessivamente": hibernar de novo; hibernar depois da data adormece o ciclo seguinte; hibernar a meio pára os avisos', async () => {
  let s = setup(); let ef = s.add('1950-05-18'); s.at(2028, 2, 18); s.engine.setEstado(ef.id, 'hibernacao'); assert.equal(iso(reativacao(ef, s.store.data.config)), '2029-02-17'); s.at(2029, 2, 17); await s.engine.check(); assert.equal(ef.estado, 'ativo'); assert.equal(s.sent.length, 1);
  s = setup(); ef = s.add('1950-05-18'); s.at(2027, 6, 1); s.engine.setEstado(ef.id, 'hibernacao'); assert.equal(ef.hibernacao.ciclo, '2028-05-18'); assert.deepEqual(await days(s, new Date(2028, 1, 10), new Date(2028, 2, 20)), []);
  s = setup(); ef = s.add('1950-05-18'); s.at(2027, 2, 17); await s.engine.check(); s.engine.setEstado(ef.id, 'hibernacao'); s.at(2027, 2, 24); await s.engine.check(); assert.equal(s.sent.length, 1);
});
test('suspenso (indefinidamente) nunca avisa; voltar a «Ativo» reinicia o calendário sem avisos em atraso falsos', async () => {
  const s = setup(); const ef = s.add('1950-05-18'); s.engine.setEstado(ef.id, 'suspenso');
  assert.deepEqual(await days(s, new Date(2027, 1, 10), new Date(2027, 5, 1)), []); assert.deepEqual(await days(s, new Date(2028, 1, 10), new Date(2028, 5, 1)), []);
  s.at(2029, 3, 20); s.engine.setEstado(ef.id, 'ativo'); assert.equal(ef.desde, '2029-03-20'); await s.engine.check(); assert.equal(s.sent.length, 0); s.at(2029, 3, 24); await s.engine.check(); assert.equal(s.sent.length, 1); assert.doesNotMatch(txt(s.sent[0]), /Não foi possível/);
});
test('com a hibernação desligada nas Definições, hibernar é recusado e as hibernadas voltam a avisar; sem data é recusado', async () => {
  const s = setup({ cfg: { permitir_hibernacao: false } }); s.add('1950-05-18', { estado: 'hibernacao', hibernacao: { ciclo: '2027-05-18' } });
  assert.throws(() => s.engine.setEstado(s.add('1960-05-18').id, 'hibernacao'), /desativada/); s.at(2027, 2, 17); await s.engine.check(); assert.equal(s.sent.length, 1);
  const t = setup(); assert.throws(() => t.engine.setEstado(t.add('').id, 'hibernacao'), /não tem data/);
});
test('Estado → E-mails: o último e-mail de cada efeméride', async () => { const s = setup(); const a = s.add('1950-05-18'); s.add('1960-05-18'); s.at(2027, 2, 17); await s.engine.check(); assert.equal(s.engine.ultimoEmail(a.id).estado, 'enviado'); assert.equal(s.engine.ultimoEmail('x'), null); });

// ---- Anuário
const { anuario } = require('../src/engine/anuario');
test('anuário: efemérides por mês (só dia e mês), ordenadas por dia; estado «efetivo»; sem data ficam de fora', () => {
  const s = setup(); s.add('1980-02-09', { titulo: 'Traulitânia' }); s.add('1953-05-18', { titulo: 'Dia Internacional dos Museus' }); s.add('1900-05-18', { titulo: 'Clemente Menéres', estado: 'hibernacao', hibernacao: { ciclo: '2027-05-18' } }); s.add('1900-05-25', { titulo: 'Dia do Município', estado: 'suspenso' }); s.add('');
  const m = anuario(s.store.data.efemerides, s.store.data.config); assert.equal(m.length, 12); assert.equal(m[0].nome, 'Janeiro'); assert.equal(m[0].itens.length, 0);
  assert.deepEqual(m[1].itens.map(i => [i.dia, i.titulo, i.estado]), [[9, 'Traulitânia', 'ativo']]); assert.deepEqual(m[4].itens.map(i => [i.dia, i.titulo, i.estado]), [[18, 'Clemente Menéres', 'hibernacao'], [18, 'Dia Internacional dos Museus', 'ativo'], [25, 'Dia do Município', 'suspenso']]);
  assert.equal(anuario(s.store.data.efemerides, { permitir_hibernacao: false })[4].itens[0].estado, 'ativo');
});
test('todos os e-mails levam o Anuário (12 meses, com as cores dos estados)', async () => {
  const s = setup(); s.add('1950-05-18', { titulo: 'Museus' }); s.add('1960-03-29', { titulo: 'Ordem Militar', estado: 'suspenso' }); s.add('1970-09-01', { titulo: 'Adormecida', estado: 'hibernacao', hibernacao: { ciclo: '2027-09-01' } }); s.at(2027, 2, 17); await s.engine.check();
  const h = s.sent[0].html; assert.equal((h.match(/<b>(Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)<\/b>/g) || []).length, 12);
  assert.match(h, /color:#1a7f37">18, Museus/); assert.match(h, /color:#b91c1c">29, Ordem Militar/); assert.match(h, /color:#c2410c">1, Adormecida/); assert.ok(h.indexOf('Anuário') > h.indexOf('Aviso:'));
});

// ---- Limpeza anual e dados
test('todos os anos limpa o histórico dos avisos (não as efemérides) e mantém os ciclos em curso', async () => {
  const s = setup(); s.add('1950-01-20', { titulo: 'Em curso' }); s.add('1950-05-18', { titulo: 'Futura' }); s.at(2027, 12, 31); await s.engine.check(); assert.equal(s.sent.length, 1); assert.equal(s.store.data.estado.limpezaAno, 2027);
  const chaves = Object.keys(s.store.data.enviados).length; assert.ok(chaves > 0);
  s.at(2028, 1, 1); await s.engine.check(); const d = s.store.data;
  assert.equal(s.sent.length, 1); assert.equal(d.efemerides.length, 2); assert.deepEqual(d.historico.map(h => h.msg), ['Histórico de avisos de 2027 limpo.']); assert.equal(d.outbox.filter(i => i.estado === 'enviado').length, 0); assert.equal(Object.keys(d.enviados).length, chaves); assert.equal(d.estado.limpezaAno, 2028);
  s.at(2028, 1, 2); await s.engine.check(); assert.equal(s.sent.length, 1);
});
test('dados de versões de teste anteriores (qualquer formato) são apagados uma só vez: a app arranca absolutamente vazia', () => {
  for (const velho of [{ config: { destinatarios: ['velho@x.pt'] }, efemerides: [{ id: 'a', titulo: 'Antigo' }] }, { versao: 3, config: { destinatario: 'novo@x.pt', nome: 'Z' }, efemerides: [{ id: 'b', titulo: 'Da 0.3', data: '1950-01-01' }], outbox: [{ id: 'o' }], historico: [{ tipo: 'envio', msg: 'x' }] }]) {
    const s = setup(); fs.mkdirSync(path.join(s.dir, 'imagens'), { recursive: true }); fs.writeFileSync(path.join(s.dir, 'imagens', 'i.jpg'), 'x'); fs.writeFileSync(path.join(s.dir, 'copias', 'dados-2026-10-30.json'), '{}'); fs.writeFileSync(path.join(s.dir, 'copias', 'anterior-1.json'), '{}');
    fs.writeFileSync(path.join(s.dir, 'dados.json'), JSON.stringify(velho));
    const st = new Store(s.dir), d = st.data;
    assert.deepEqual([d.efemerides.length, d.outbox.length, d.historico.length, d.enviados && Object.keys(d.enviados).length, d.config.destinatario, d.config.nome], [0, 0, 0, 0, '', '']); assert.equal(st.recovered, null);
    assert.deepEqual(fs.readdirSync(path.join(s.dir, 'copias')), []); assert.ok(!fs.existsSync(path.join(s.dir, 'imagens'))); assert.ok(!fs.existsSync(path.join(s.dir, 'dados.json')));
    st.data.efemerides.push({ id: 'n', titulo: 'Novo', data: '2000-01-01', estado: 'ativo' }); st.save(); const st2 = new Store(s.dir); assert.equal(st2.data.efemerides[0].titulo, 'Novo'); assert.equal(st2.data.versao, 4);
  }
});
test('ficheiro de dados danificado: recupera da cópia de segurança; gravação atómica', async () => {
  const s = setup(); s.add('1950-05-18', { titulo: 'Importante' }); s.at(2027, 2, 17); await s.engine.check(); s.store.save(); s.at(2027, 2, 18); s.store.save();
  assert.ok(!fs.existsSync(path.join(s.dir, 'dados.json.tmp'))); fs.writeFileSync(path.join(s.dir, 'dados.json'), '{"efemerides": [ corrompido');
  const st2 = new Store(s.dir, { now: () => new Date(s.clock.t) }); assert.ok(st2.recovered); assert.equal(st2.data.efemerides[0].titulo, 'Importante');
});
test('arranque tardio: se a hora já passou, envia logo', async () => { const s = setup(); s.add('1950-05-18'); s.at(2027, 2, 17, 16, 30); await s.engine.check(); assert.equal(s.sent.length, 1); });
