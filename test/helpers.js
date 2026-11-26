'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { Store } = require('../src/engine/store'); const { Engine } = require('../src/engine/engine');
function setup({ cfg = {}, dir } = {}) {
  dir = dir || fs.mkdtempSync(path.join(os.tmpdir(), 'efemera-t-'));
  const clock = { t: new Date(2027, 1, 10, 8, 0) }, now = () => new Date(clock.t);
  const sent = [], notes = []; const tx = { fail: 0, calls: 0 };
  const transport = () => ({ send: async m => { tx.calls++; if (tx.fail > 0) { tx.fail--; throw new Error('Outlook indisponível'); } sent.push(m); } });
  const store = new Store(dir, { now });
  Object.assign(store.data.config, { nome: 'Ana', destinatario: 'ana@cm-mirandela.pt', hora: '09:00', antecedencia: 90 }, cfg);
  const engine = new Engine({ store, transport, notify: (t, b) => notes.push([t, b]), now });
  const at = (y, m, d, h = 9, mi = 0) => { clock.t = new Date(y, m - 1, d, h, mi); };
  let n = 0; const add = (data, extra = {}) => { const ef = { id: 'e' + ++n, titulo: 'Efeméride ' + n, tipo: 'acontecimentos', data, estado: 'ativo', hibernacao: null, ...extra }; store.data.efemerides.push(ef); return ef; };
  const reopen = () => { const s2 = new Store(dir, { now }); return new Engine({ store: s2, transport, notify: (t, b) => notes.push([t, b]), now }); };
  return { dir, clock, at, store, engine, sent, notes, tx, add, reopen };
}
module.exports = { setup };
