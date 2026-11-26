'use strict';
const { app, BrowserWindow, Tray, Menu, ipcMain, Notification, powerMonitor, nativeImage } = require('electron');
const path = require('path');
const SMOKE = !!process.env.EFEMERA_SMOKE;
if (process.env.EFEMERA_DATA) app.setPath('userData', process.env.EFEMERA_DATA);
app.setAppUserModelId('pt.cm-mirandela.efemera');
if (!app.requestSingleInstanceLock()) { app.quit(); return; }

const { Store } = require('./engine/store'), { Engine } = require('./engine/engine'), { outlookTransport } = require('./engine/mailer');
const { anuario } = require('./engine/anuario'), S = require('./engine/schedule'), D = require('./engine/dates'), { TIPOS, tipoNome } = require('./engine/types');
const MAX_PALAVRAS = 250;
const ICON = path.join(__dirname, '..', 'assets', 'icon.png'), HIDDEN = process.argv.includes('--minimizado');
let win = null, tray = null, store, engine, quitting = false;
const outlook = outlookTransport(), smokeMail = []; // smokeMail: só no teste automático (EFEMERA_SMOKE), que nunca chama o Outlook

const toast = (title, body) => { try { if (Notification.isSupported()) { const n = new Notification({ title, body, icon: ICON }); n.on('click', showWin); n.show(); } } catch {} };
function showWin() { if (!win) createWin(); win.show(); win.focus(); }
function createWin() {
  win = new BrowserWindow({ width: 1180, height: 760, minWidth: 900, minHeight: 560, show: false, title: 'EFÉMERA', icon: ICON, autoHideMenuBar: true, backgroundColor: '#000',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true } });
  win.setMenu(null); win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.once('ready-to-show', () => { if (!HIDDEN && !SMOKE) win.show(); });
  win.on('close', e => { if (!quitting && !SMOKE) { e.preventDefault(); win.hide(); } }); // fechar = continua em segundo plano a avisar
}
function createTray() {
  tray = new Tray(nativeImage.createFromPath(ICON).resize({ width: 16, height: 16 })); tray.setToolTip('EFÉMERA — a vigiar os avisos');
  tray.setContextMenu(Menu.buildFromTemplate([{ label: 'Abrir EFÉMERA', click: showWin }, { type: 'separator' }, { label: 'Sair (os avisos deixam de ser enviados)', click: () => { quitting = true; app.quit(); } }]));
  tray.on('click', showWin);
}
const loginItem = on => { try { app.setLoginItemSettings({ openAtLogin: !!on, args: ['--minimizado'], name: 'EFEMERA' }); } catch {} };
const recheck = () => engine.check().catch(e => store.log('falha', 'Erro na verificação: ' + e.message));

const view = ef => {
  const t = D.midnight(engine.now()), valid = !!D.parseISO(ef.data), est = S.estadoOf(ef), cfg = store.data.config;
  let next = null, anos = null, avisos = valid ? '' : 'Sem data: não gera avisos';
  if (valid) {
    const O = S.occurrencesFrom(ef.data, t)[0], pl = S.plan(ef, cfg, O), prox = pl.days.find(d => d >= t); next = { data: D.iso(O), dias: D.diffDays(O, t) }; anos = S.anosDeAniversario(ef.data, t.getFullYear());
    if (est === 'suspenso') avisos = 'Suspenso: sem avisos';
    else if (est === 'hibernacao' && cfg.permitir_hibernacao !== false) { const r = S.reativacao(ef, cfg); avisos = r ? `Adormecida até ${D.fmtShort(r)}` : 'Em hibernação'; }
    else avisos = !prox ? '' : D.diffDays(prox, t) === 0 ? `Aviso de hoje (${pl.days.indexOf(prox) + 1} de ${pl.days.length})` : `Próximo aviso: ${D.fmtShort(prox)}`;
  } else if (est === 'suspenso') avisos = 'Suspenso: sem avisos';
  return { id: ef.id, titulo: ef.titulo, tipo: ef.tipo, tipoNome: tipoNome(ef.tipo), data: ef.data, texto: ef.texto || '', antecedencia: ef.antecedencia ?? null, frequencia: ef.frequencia || '', estado: est, estadoTxt: S.ESTADOS[est], next, anos, avisos };
};
const okMail = e => /^[^\s@;,]+@[^\s@;,]+\.[^\s@;,]+$/.test(e);
const h = (n, fn) => ipcMain.handle(n, async (_e, ...a) => { try { return { ok: true, data: await fn(...a) }; } catch (e) { return { ok: false, error: e.message }; } });

function registerIpc() {
  h('state', () => ({ efemerides: store.data.efemerides.map(view), config: { ...store.data.config }, tipos: TIPOS, estados: S.ESTADOS, frequencias: S.FREQUENCIAS, maxPalavras: MAX_PALAVRAS, health: engine.health(), version: app.getVersion(), minAnt: S.MIN_ANTECEDENCIA }));
  h('saveEf', ef => {
    const t = String(ef.titulo || '').trim(); if (!t) throw new Error('Indique o título.');
    if (ef.data && !D.parseISO(ef.data)) throw new Error('Data inválida.');
    const A = ef.antecedencia === '' || ef.antecedencia == null ? null : +ef.antecedencia, err = S.validate(A ?? store.data.config.antecedencia); if (err) throw new Error(err);
    const texto = String(ef.texto || '').trim(), palavras = texto ? texto.split(/\s+/).length : 0; if (palavras > MAX_PALAVRAS) throw new Error(`O texto tem ${palavras} palavras (máximo ${MAX_PALAVRAS}).`);
    if (ef.estado === 'hibernacao' && !ef.data) throw new Error('Para hibernar, a efeméride precisa de ter data.');
    const cur = ef.id && store.data.efemerides.find(x => x.id === ef.id), freq = S.FREQUENCIAS[ef.frequencia] ? ef.frequencia : null;
    const rec = { id: cur ? cur.id : 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), titulo: t, tipo: ef.tipo || 'outro', data: ef.data || '', texto, antecedencia: A, frequencia: freq, estado: cur ? cur.estado : 'ativo', hibernacao: cur ? cur.hibernacao || null : null, desde: cur ? cur.desde : D.iso(D.midnight(engine.now())) };
    if (cur && (cur.data !== rec.data || (cur.antecedencia ?? null) !== A || (cur.frequencia ?? null) !== freq)) rec.desde = D.iso(D.midnight(engine.now())); // novo calendário de avisos: o passado não conta como falhado
    if (cur) Object.assign(cur, rec); else store.data.efemerides.push(rec);
    if (ef.estado && ef.estado !== rec.estado) engine.setEstado(rec.id, ef.estado);
    store.save(); recheck(); return rec.id;
  });
  h('setEstado', (id, estado) => { engine.setEstado(id, estado); recheck(); return true; });
  h('deleteEf', id => { store.data.efemerides = store.data.efemerides.filter(x => x.id !== id); store.log('sistema', 'Efeméride eliminada.'); store.save(); });
  h('saveConfig', c => {
    const cfg = store.data.config, dest = String(c.destinatario || '').trim();
    if (dest && !okMail(dest)) throw new Error('Indique um único e-mail válido.');
    const err = S.validate(c.antecedencia); if (err) throw new Error(err);
    if (!S.FREQUENCIAS[c.frequencia]) throw new Error('Escolha a frequência dos avisos.');
    if (!/^\d{1,2}:\d{2}$/.test(c.hora || '')) throw new Error('Hora inválida (HH:MM).');
    Object.assign(cfg, { nome: String(c.nome || '').trim(), destinatario: dest, hora: c.hora, antecedencia: Math.round(+c.antecedencia), frequencia: c.frequencia, permitir_hibernacao: !!c.permitir_hibernacao });
    if (c.iniciarComWindows !== undefined) loginItem(c.iniciarComWindows);
    store.save(); recheck(); return true;
  });
  h('anos', data => (D.parseISO(data) ? S.anosDeAniversario(data, D.midnight(engine.now()).getFullYear()) : null)); // anos de aniversário no ano corrente
  h('sendTest', () => engine.sendTest());
  // Separador Estado → E-mails: estado de cada efeméride + último e-mail e se foi enviado
  h('emails', () => store.data.efemerides.map(view).sort((a, b) => (a.next ? a.next.dias : 1e9) - (b.next ? b.next.dias : 1e9)).map(e => { const u = engine.ultimoEmail(e.id);
    return { id: e.id, titulo: e.titulo, estado: e.estado, estadoTxt: e.estadoTxt, detalhe: e.avisos, ultimo: u ? { id: u.id, criado: u.criado, envio: u.estado, tentativas: u.tentativas, erro: u.erro, assunto: u.subject } : null }; }));
  h('history', () => store.data.historico.slice().reverse().slice(0, 150));
  h('anuario', () => anuario(store.data.efemerides, store.data.config));
  h('agenda', () => { // janelas de avisos + efemérides adormecidas (com a data de reativação) + efemérides sem data
    const cfg = store.data.config, itens = engine.janelas(120).map(j => ({ tipo: 'aviso', ...j }));
    for (const ef of store.data.efemerides) {
      const e = S.estadoOf(ef);
      if (e === 'hibernacao' && cfg.permitir_hibernacao !== false) { const r = S.reativacao(ef, cfg); itens.push({ tipo: 'hibernacao', id: ef.id, titulo: ef.titulo, inicio: r ? D.iso(r) : '' }); }
      else if (e === 'ativo' && !D.parseISO(ef.data)) itens.push({ tipo: 'sem-data', id: ef.id, titulo: ef.titulo });
    }
    const rank = i => (i.tipo === 'sem-data' ? 1 : 0);
    return itens.sort((a, b) => rank(a) - rank(b) || (a.inicio || '').localeCompare(b.inicio || ''));
  });
  h('retry', id => engine.retry(id));
}

app.on('second-instance', (_e, argv) => { if (!argv.includes('--minimizado')) showWin(); });
app.on('window-all-closed', () => {});
app.whenReady().then(async () => {
  store = new Store(app.getPath('userData'));
  engine = new Engine({ store, transport: () => (SMOKE ? { send: async m => { smokeMail.push(m); } } : outlook), notify: toast });
  if (store.recovered) toast('EFÉMERA — dados recuperados', store.recovered);
  registerIpc(); createWin(); if (!SMOKE) createTray();
  const first = !store.data.estado.ultimoArranque; engine.start();
  if (first && !SMOKE) loginItem(true);
  await recheck();
  setInterval(recheck, 60 * 1000);
  powerMonitor.on('resume', () => setTimeout(recheck, 8000));
  powerMonitor.on('unlock-screen', recheck);
  if (SMOKE) require('../test/smoke-run')({ win, store, engine, app, smokeMail });
});
