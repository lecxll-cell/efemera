'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), { EventEmitter } = require('events');
const { outlookTransport, PS } = require('../src/engine/mailer');
function fakeSpawn({ code = 0, stderr = '', enoent = false, hang = false } = {}) {
  const calls = [];
  const spawn = (cmd, args) => { const p = new EventEmitter(); p.stderr = new EventEmitter(); let input = ''; p.stdin = { end: d => { input = d; calls.push({ cmd, args, input }); if (hang) return; setImmediate(() => { if (enoent) { const e = new Error('spawn powershell.exe ENOENT'); e.code = 'ENOENT'; return p.emit('error', e); } if (stderr) p.stderr.emit('data', stderr); p.emit('close', code); }); } }; p.kill = () => {}; return p; };
  return { spawn, calls };
}
const msg = { to: ['ana@cm-mirandela.pt'], subject: '[EFÉMERA] Faltam 90 dias: «Museus» (18 de maio)', html: '<p>Olá — ação</p>' };
test('Outlook clássico: chama o PowerShell com o script fixo e envia a mensagem em JSON (UTF-8) pelo stdin', async () => {
  const f = fakeSpawn(); const r = await outlookTransport({ spawn: f.spawn }).send(msg); assert.equal(r.via, 'outlook');
  const c = f.calls[0]; assert.equal(c.cmd, 'powershell.exe'); assert.ok(c.args.includes('-EncodedCommand')); const script = Buffer.from(c.args[c.args.length - 1], 'base64').toString('utf16le');
  assert.equal(script, PS); assert.match(script, /Outlook\.Application/); assert.match(script, /\.Send\(\)/); assert.match(script, /UTF8/);
  assert.deepEqual(JSON.parse(c.input), { to: ['ana@cm-mirandela.pt'], subject: msg.subject, html: msg.html });
});
test('o conteúdo do e-mail nunca vai para a linha de comandos (sem injeção)', async () => {
  const f = fakeSpawn(); await outlookTransport({ spawn: f.spawn }).send({ ...msg, subject: '"; Remove-Item C:\\ -Recurse #' }); assert.ok(!f.calls[0].args.join(' ').includes('Remove-Item'));
});
test('erro do Outlook: mensagem clara com a dica do «novo Outlook»', async () => {
  const f = fakeSpawn({ code: 1, stderr: 'Retrieving the COM class factory failed' }); await assert.rejects(outlookTransport({ spawn: f.spawn }).send(msg), e => /Outlook clássico/.test(e.message) && /novo Outlook/.test(e.message) && /COM class/.test(e.message));
});
test('sem PowerShell (não é Windows): mensagem clara', async () => { const f = fakeSpawn({ enoent: true }); await assert.rejects(outlookTransport({ spawn: f.spawn }).send(msg), /só funciona no Windows/); });
test('Outlook sem resposta: dá erro ao fim do tempo limite em vez de ficar pendurado', async () => { const f = fakeSpawn({ hang: true }); await assert.rejects(outlookTransport({ spawn: f.spawn, timeoutMs: 50 }).send(msg), /não respondeu/); });
