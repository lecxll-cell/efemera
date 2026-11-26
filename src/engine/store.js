'use strict';
const fs = require('fs'); const path = require('path');
const { iso } = require('./dates');
const VERSAO = 4; // dados de versões de teste anteriores (sem este número) são apagados e a app arranca absolutamente vazia
const DEFAULTS = () => ({
  versao: VERSAO,
  config: { nome: '', destinatario: '', hora: '09:00', antecedencia: 90, frequencia: 'semanal', permitir_hibernacao: true },
  efemerides: [], enviados: {}, outbox: [], historico: [], estado: { ultimaVerificacao: null, ultimoArranque: null, ultimoEnvio: null, limpezaAno: null },
});
const merge = (d, s) => { for (const k of Object.keys(s || {})) d[k] = (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k]) && s[k] && typeof s[k] === 'object') ? merge(d[k], s[k]) : s[k]; return d; };

// Gravação atómica (ficheiro temporário + rename) e cópia de segurança diária: um corte de energia a meio nunca corrompe os dados.
class Store {
  constructor(dir, { now = () => new Date() } = {}) {
    this.dir = dir; this.file = path.join(dir, 'dados.json'); this.bdir = path.join(dir, 'copias'); this.now = now; this.recovered = null;
    fs.mkdirSync(this.bdir, { recursive: true });
    this.data = this._load();
  }
  _read(f) { const j = JSON.parse(fs.readFileSync(f, 'utf8')); if (!j || typeof j !== 'object' || !Array.isArray(j.efemerides)) throw new Error('estrutura inválida'); if (j.versao !== VERSAO) throw Object.assign(new Error('versão antiga'), { antiga: true }); return merge(DEFAULTS(), j); }
  _load() {
    if (fs.existsSync(this.file)) { try { return this._read(this.file); } catch (e) { if (e.antiga) return this._limpar(); this.recovered = `Ficheiro de dados danificado (${e.message}).`; } }
    const bk = fs.readdirSync(this.bdir).filter(f => /^dados-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().reverse();
    for (const f of bk) { try { const d = this._read(path.join(this.bdir, f)); this.recovered = (this.recovered || 'Ficheiro de dados em falta.') + ` Recuperado da cópia de ${f.slice(6, 16)}.`; d.historico.push({ ts: this.now().toISOString(), tipo: 'sistema', msg: this.recovered }); return d; } catch {} }
    if (this.recovered) { try { fs.copyFileSync(this.file, this.file + '.danificado-' + Date.now()); } catch {} }
    return DEFAULTS();
  }
  _limpar() { // uma só vez: apaga tudo o que veio de versões de teste (dados, imagens, cópias) e começa vazio
    fs.rmSync(this.file, { force: true });
    fs.rmSync(path.join(this.dir, 'imagens'), { recursive: true, force: true });
    for (const f of fs.readdirSync(this.bdir)) fs.rmSync(path.join(this.bdir, f), { force: true });
    return DEFAULTS();
  }
  save() {
    const today = iso(this.now()), bk = path.join(this.bdir, `dados-${today}.json`), tmp = this.file + '.tmp', txt = JSON.stringify(this.data, null, 1);
    // Cópia de segurança diária (a partir do ficheiro em disco), feita mesmo quando não há escrita nova.
    if (!fs.existsSync(bk) && fs.existsSync(this.file)) { try { fs.copyFileSync(this.file, bk); } catch {} this._prune(); }
    if (txt === this._ultimoGravado) return; // nada mudou desde a última gravação: não reescreve (evita ~1440 escritas iguais por dia)
    const fd = fs.openSync(tmp, 'w'); try { fs.writeSync(fd, txt); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    fs.renameSync(tmp, this.file);
    this._ultimoGravado = txt;
  }
  _prune() { const f = fs.readdirSync(this.bdir).filter(x => /^dados-/.test(x)).sort(); while (f.length > 30) fs.rmSync(path.join(this.bdir, f.shift()), { force: true }); }
  log(tipo, msg) { this.data.historico.push({ ts: this.now().toISOString(), tipo, msg }); if (this.data.historico.length > 600) this.data.historico.splice(0, this.data.historico.length - 600); }
}
module.exports = { Store };
