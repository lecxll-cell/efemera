'use strict';
const { fmtLong, fmtShort, fmtDM } = require('./dates');
const { tipoNome } = require('./types');
const { anuario } = require('./anuario');
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const diasLong = n => (n <= 0 ? 'é hoje' : n === 1 ? 'falta 1 dia (amanhã)' : `faltam ${n} dias`);
const diasShort = n => (n <= 0 ? 'Hoje' : n === 1 ? 'Falta 1 dia' : `Faltam ${n} dias`);
const listDays = ds => (ds.length > 4 ? `${fmtShort(ds[0])} … ${fmtShort(ds[ds.length - 1])} (${ds.length} avisos)` : ds.map(fmtShort).join(', '));
const marco = i => (i.anos && i.anos.marco ? ` · ${i.anos.texto}` : '');

function subject(items) {
  const a = items[0], atraso = items.some(i => i.kind === 'atraso');
  if (items.length === 1) return `[EFÉMERA] ${atraso ? 'Aviso em atraso — ' : ''}${diasShort(a.dias)}: «${a.ef.titulo}» (${fmtDM(a.O)})${marco(a)}`;
  const near = items.slice().sort((x, y) => x.dias - y.dias)[0];
  return `[EFÉMERA] ${items.length} efemérides a preparar — a mais próxima: «${near.ef.titulo}» (${diasShort(near.dias).toLowerCase()})${marco(near)}${atraso ? ' · inclui aviso em atraso' : ''}`;
}
const COR = { ativo: '#1a7f37', hibernacao: '#c2410c', suspenso: '#b91c1c' };
function anuarioHtml(efemerides, cfg) {
  const c = k => `<span style="color:${COR[k]}">`;
  return `<h3 style="margin:1.6em 0 .3em">Anuário</h3><p style="color:#666;font-size:12px;margin:0 0 .6em">Todas as efemérides registadas, por mês. ${c('ativo')}Verde</span>: avisos ativos · ${c('hibernacao')}laranja</span>: em hibernação · ${c('suspenso')}vermelho</span>: suspensa.</p>` +
    anuario(efemerides, cfg).map(m => `<p style="margin:.7em 0 .1em"><b>${m.nome}</b></p>` + (m.itens.length ? m.itens.map(i => `<div style="color:${COR[i.estado]}">${i.dia}, ${esc(i.titulo)}</div>`).join('') : '<div style="color:#999">—</div>')).join('');
}
function build({ items, cfg, now, efemerides }) {
  const sorted = items.slice().sort((x, y) => x.dias - y.dias);
  const h = [`<p>Olá${cfg.nome ? ', ' + esc(cfg.nome) : ''}.</p>`, `<p>${sorted.length === 1 ? 'Tem uma efeméride a assinalar:' : `Tem <b>${sorted.length} efemérides</b> a assinalar:`}</p>`];
  sorted.forEach((i, n) => {
    const ef = i.ef, linhas = [['Data', `${fmtLong(i.O)} — ${diasLong(i.dias)}`], ['Tipo', tipoNome(ef.tipo) || '—']];
    if (i.anos) linhas.splice(1, 0, ['Anos de aniversário', i.anos.texto]);
    if (i.kind === 'diario') linhas.push(['Aviso', `${i.aviso.n} de ${i.aviso.total} · ${i.frequencia}`], ['Próximo aviso', i.proximo ? fmtShort(i.proximo) : 'este foi o último deste ano']);
    h.push(`<div style="border-left:4px solid #8a3b12;padding:.2em .8em;margin:.8em 0"><b>${n + 1}. ${esc(ef.titulo)}</b><br>` + linhas.map(([k, v]) => `<span style="color:#666">${k}:</span> ${esc(v)}`).join('<br>'));
    if (i.kind === 'atraso') { const m = `Este aviso estava previsto para ${listDays(i.atrasados)} mas a aplicação não esteve ativa. ${diasLong(i.dias).replace(/^./, c => c.toUpperCase())}.`; h.push(`<br><b style="color:#9a6a00">⚠ ${esc(m)}</b>`); }
    else if (i.atrasados.length) { const m = `Não foi possível avisar em: ${listDays(i.atrasados)} (a aplicação não esteve ativa).`; h.push(`<br><b style="color:#9a6a00">⚠ ${esc(m)}</b>`); }
    h.push('</div>');
  });
  const foot = `Enviado automaticamente pela EFÉMERA em ${fmtShort(now)} às ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}. Para alterar a antecedência, a duração ou suspender uma efeméride, abra a EFÉMERA.`;
  h.push(anuarioHtml(efemerides, cfg), `<hr><p style="color:#888;font-size:12px">${esc(foot)}</p>`);
  return { subject: subject(sorted), html: `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#222">${h.join('')}</div>` };
}
module.exports = { build };
