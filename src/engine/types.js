'use strict';
// «filtro»: nome usado nos filtros do Anuário, quando difere do nome do tipo.
const TIPOS = [
  { id: 'acontecimentos', nome: 'Acontecimentos históricos', filtro: 'Acontecimentos Históricos', exemplos: 'batalhas, chegada e estabelecimento de comunidades, inaugurações' },
  { id: 'dias', nome: 'Dias nacionais e internacionais', filtro: 'Dias nacionais e internacionais de património cultural', exemplos: 'Monumentos e Sítios, Museus, Património Imaterial' },
  { id: 'distincoes', nome: 'Distinções e condecorações', exemplos: 'condecorações a pessoas ou instituições do concelho' },
  { id: 'documentos', nome: 'Documentos históricos', exemplos: 'forais, cartas, tratados, decretos' },
  { id: 'encontros', nome: 'Encontros, palestras e jornadas', exemplos: 'colóquios, congressos, palestras, jornadas' },
  { id: 'inscricoes', nome: 'Inscrições e Categorias de classificação', exemplos: 'classificação de monumentos, inscrição em inventários, Património Mundial' },
  { id: 'instituicoes', nome: 'Instituições e coletividades', exemplos: 'fundação de instituições, associações e coletividades locais' },
  { id: 'pessoas', nome: 'Pessoas', exemplos: 'nascimentos, falecimentos, visitas de personalidades' },
  { id: 'praticas', nome: 'Práticas rituais, sociais e eventos festivos', exemplos: 'Reis de Vale de Salgueiro, Caretos de Torre de Dona Chama' },
  { id: 'outro', nome: 'Outro', exemplos: '' },
];
const tipoNome = id => (TIPOS.find(t => t.id === id) || { nome: id || '' }).nome;
module.exports = { TIPOS, tipoNome };
