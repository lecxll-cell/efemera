'use strict';
const { parseISO } = require('./dates');
const { estadoOf } = require('./schedule');
const NOMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
// Anuário: todas as efemérides com data, distribuídas pelos meses do ano (dia e mês; o ano original não conta).
function anuario(efs, cfg) {
  const meses = NOMES.map((nome, i) => ({ mes: i + 1, nome, itens: [] }));
  for (const e of efs) {
    const d = parseISO(e.data); if (!d) continue;
    let estado = estadoOf(e); if (estado === 'hibernacao' && cfg.permitir_hibernacao === false) estado = 'ativo'; // sem hibernação, avisa como ativa
    meses[d.getMonth()].itens.push({ id: e.id, dia: d.getDate(), titulo: e.titulo, tipo: e.tipo, estado });
  }
  for (const m of meses) m.itens.sort((a, b) => a.dia - b.dia || a.titulo.localeCompare(b.titulo, 'pt'));
  return meses;
}
module.exports = { anuario };
