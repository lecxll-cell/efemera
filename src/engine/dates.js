'use strict';
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// Valida de verdade: "2027-02-31" não existe e devolve null.
const parseISO = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); if (!m) return null; const d = new Date(+m[1], +m[2] - 1, +m[3]); return d.getMonth() === +m[2] - 1 && d.getDate() === +m[3] ? d : null; };
const midnight = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); // aritmética de calendário: imune a horas de verão
const diffDays = (a, b) => Math.round((Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()) - Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())) / 864e5);
// Aniversário no ano dado. 29 de fevereiro cai a 28 de fevereiro nos anos não bissextos.
const occurrence = (dataISO, year) => { const [, m, d] = dataISO.split('-').map(Number); return new Date(year, m - 1, Math.min(d, new Date(year, m, 0).getDate())); };
const WD = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const fmtLong = d => `${d.getDate()} de ${MES[d.getMonth()]} de ${d.getFullYear()} (${WD[d.getDay()]})`;
const fmtShort = d => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const fmtDM = d => `${d.getDate()} de ${MES[d.getMonth()]}`;
const hhmmToMin = s => { const m = /^(\d{1,2}):(\d{2})$/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : 540; };
const minutesOf = d => d.getHours() * 60 + d.getMinutes();
module.exports = { iso, parseISO, midnight, addDays, diffDays, occurrence, fmtLong, fmtShort, fmtDM, hhmmToMin, minutesOf };
