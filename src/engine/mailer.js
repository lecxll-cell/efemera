'use strict';
const { spawn: realSpawn } = require('child_process');

// Envio SEMPRE através do Outlook clássico instalado no computador (sem servidor, sem palavra-passe).
// NÃO funciona com o «novo Outlook». O texto do script é fixo; a mensagem segue em JSON pelo stdin (sem injeção de comandos).
const PS = `$ErrorActionPreference='Stop';[Console]::InputEncoding=[Text.Encoding]::UTF8;$j=[Console]::In.ReadToEnd()|ConvertFrom-Json;$o=New-Object -ComObject Outlook.Application;$m=$o.CreateItem(0);$m.To=($j.to -join ';');$m.Subject=$j.subject;$m.HTMLBody=$j.html;$m.Send()`;
const DICA = 'Confirme que o Outlook clássico está instalado e com a sua conta configurada (não funciona com o «novo Outlook»).';
const friendly = e => (e && e.code === 'ENOENT' ? new Error('Não foi possível executar o PowerShell: esta aplicação só funciona no Windows.') : new Error(`Outlook clássico: ${String((e && e.message) || e).trim() || 'erro desconhecido'}. ${DICA}`));

function outlookTransport({ spawn = realSpawn, timeoutMs = 90000 } = {}) {
  return {
    send: m => new Promise((res, rej) => {
      let p, err = '', done = false, t;
      const fin = (f, v) => { if (!done) { done = true; clearTimeout(t); f(v); } };
      try { p = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(PS, 'utf16le').toString('base64')], { windowsHide: true }); }
      catch (e) { return rej(friendly(e)); }
      t = setTimeout(() => { try { p.kill(); } catch {} fin(rej, new Error(`O Outlook não respondeu em ${Math.round(timeoutMs / 1000)} segundos. ${DICA}`)); }, timeoutMs);
      p.stderr.on('data', d => { err += d; }); p.on('error', e => fin(rej, friendly(e)));
      p.on('close', c => (c === 0 ? fin(res, { via: 'outlook' }) : fin(rej, friendly(new Error(err.trim() || 'código ' + c)))));
      p.stdin.end(JSON.stringify({ to: m.to, subject: m.subject, html: m.html }));
    }),
  };
}
module.exports = { outlookTransport, PS };
