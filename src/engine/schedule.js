'use strict';
const { addDays, occurrence, parseISO } = require('./dates');
const MIN_ANTECEDENCIA = 90, MAX_ANTECEDENCIA = 365;

// Estados da efeméride (textos exatos pedidos).
const ESTADOS = {
  ativo: 'Ativo (saído da hibernação, deverá começar a ser notificado)',
  hibernacao: 'Ativo (em hibernação)',
  suspenso: 'Suspenso (indefinidamente)',
};
const estadoOf = ef => (ESTADOS[ef.estado] ? ef.estado : 'ativo');

// Frequências dos avisos. O período de avisos vai sempre de (data − antecedência, mín. 90 dias) até à data.
const FREQUENCIAS = { diarios: 'Diários', 'dias-semana': 'Dias de semana', alternados: 'Dia sim, dia não', semanal: 'Semana a semana', quinzenal: 'De 15 em 15 dias', mensal: 'De mês a mês' };
const frequenciaOf = (ef, cfg) => (FREQUENCIAS[ef.frequencia] ? ef.frequencia : FREQUENCIAS[cfg.frequencia] ? cfg.frequencia : 'semanal');
const num = v => (v === '' || v == null || !Number.isFinite(+v) ? null : +v);
const antecedenciaOf = (ef, cfg) => Math.min(Math.max(Math.round(num(ef.antecedencia) ?? +cfg.antecedencia) || MIN_ANTECEDENCIA, MIN_ANTECEDENCIA), MAX_ANTECEDENCIA);
function validate(A) {
  if (!Number.isFinite(+A) || +A < MIN_ANTECEDENCIA) return `A antecedência mínima é de ${MIN_ANTECEDENCIA} dias.`;
  return +A > MAX_ANTECEDENCIA ? `A antecedência máxima é de ${MAX_ANTECEDENCIA} dias.` : '';
}
// «De mês a mês»: no dia do início e em cada mês seguinte, enquanto não passar a data.
function meses(start, O) {
  const out = [];
  for (let k = 0; ; k++) { const d = new Date(start.getFullYear(), start.getMonth() + k, Math.min(start.getDate(), new Date(start.getFullYear(), start.getMonth() + k + 1, 0).getDate())); if (d > O) return out; out.push(d); }
}
function plan(ef, cfg, O) {
  const A = antecedenciaOf(ef, cfg), f = frequenciaOf(ef, cfg), start = addDays(O, -A), todos = [];
  for (let d = start; d <= O; d = addDays(d, 1)) todos.push(d);
  const days = f === 'mensal' ? meses(start, O) : todos.filter((d, i) => f === 'diarios' || (f === 'dias-semana' && d.getDay() >= 1 && d.getDay() <= 5) || (f === 'alternados' && i % 2 === 0) || (f === 'semanal' && i % 7 === 0) || (f === 'quinzenal' && i % 15 === 0));
  return { O, A, f, start, days };
}
// Ocorrências ainda relevantes: a deste ano e a do próximo (a janela da seguinte pode já ter começado).
function occurrencesFrom(dataISO, today) { const y = today.getFullYear(); return [occurrence(dataISO, y), occurrence(dataISO, y + 1)].filter(O => O >= today); }
function recentPast(dataISO, today, maxDays = 45) { const y = today.getFullYear(); return [occurrence(dataISO, y - 1), occurrence(dataISO, y)].filter(O => O < today && (today - O) / 864e5 <= maxDays); }
// Hibernação: os avisos do ciclo em curso ficam adormecidos e reativam-se quando abre o período de avisos do ano seguinte (data − antecedência).
function reativacao(ef, cfg) { const ciclo = parseISO(ef.hibernacao && ef.hibernacao.ciclo); return ciclo ? addDays(occurrence(ef.data, ciclo.getFullYear() + 1), -antecedenciaOf(ef, cfg)) : null; }

// Anos de aniversário (para não perder centenários, cinquentenários…). Múltiplos de 25 são «marcos».
const NOMES = { 25: 'quarto de século', 50: 'cinquentenário', 100: 'centenário', 150: 'sesquicentenário', 200: 'bicentenário', 300: 'tricentenário', 400: 'quadricentenário', 500: 'quinto centenário', 1000: 'milenário' };
function anosDeAniversario(dataISO, ano) {
  const n = ano - parseInt(dataISO, 10); if (!(n > 0)) return null;
  const marco = n % 25 === 0, nome = marco ? NOMES[n] || 'aniversário redondo' : '';
  return { n, marco, nome, texto: `${n} ${n === 1 ? 'ano' : 'anos'}${nome ? ` (${nome})` : ''}` };
}
module.exports = { MIN_ANTECEDENCIA, ESTADOS, FREQUENCIAS, estadoOf, validate, plan, occurrencesFrom, recentPast, reativacao, anosDeAniversario };
