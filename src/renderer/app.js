'use strict';
let ST = null, tab = 'efemerides', F = { q: '', tipo: '', estado: '' };
const $ = s => document.querySelector(s), esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = s => (s ? s.split('-').reverse().join('/') : '—');
const toast = m => { const t = $('#toast'); t.textContent = m; t.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => (t.style.display = 'none'), 4500); };
const wrap = fn => async (...a) => { try { return await fn(...a); } catch (e) { toast(e.message); const er = $('#err'); if (er) er.textContent = e.message; } };
async function load() { ST = await api.state(); const h = ST.health, n = h.problemas.length, p = $('#pill'); p.className = h.ok ? (n ? 'wa' : 'ok') : 'er'; p.textContent = h.ok ? (n ? `Avisos ativos · ${n} aviso(s)` : 'Avisos a funcionar') : 'ATENÇÃO: avisos com problema'; p.onclick = () => { tab = 'estado'; render(); }; }
const head = (k, h) => `<span class="k">EFÉMERA · ${k}</span><h1>${h}</h1>`;
const ICO = { anuario: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>', efemerides: '<path d="M4 6h16M4 12h16M4 18h16"/>', agenda: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>', estado: '<path d="M3 12h4l3 8 4-16 3 8h4"/>', definicoes: '<path d="M4 7h8M18 7h2M4 17h2M12 17h8"/><circle cx="15" cy="7" r="2.5"/><circle cx="9" cy="17" r="2.5"/>' };
const NOMES = { efemerides: 'Efemérides', anuario: 'Anuário', agenda: 'Agenda de avisos', estado: 'Estado', definicoes: 'Definições' };
function nav() { $('#nav').innerHTML = Object.keys(NOMES).map(t => `<button data-t="${t}" class="${tab === t ? 'on' : ''}" title="${NOMES[t]}" aria-label="${NOMES[t]}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICO[t]}</svg></button>`).join(''); }
$('#nav').onclick = e => { const b = e.target.closest('[data-t]'); if (b) { tab = b.dataset.t; render(); } };
async function render() { await load(); nav(); $('#dw').hidden = tab !== 'agenda'; ({ efemerides: vEf, anuario: vAnuario, agenda: vAgenda, estado: vEstado, definicoes: vDef })[tab](); }
const anosTxt = a => (a ? `${a.marco ? '★ ' : ''}${esc(a.texto)}` : '<span class="mt">—</span>');
const estOpts = (sel, hib) => Object.entries(ST.estados).map(([k, v]) => `<option value="${k}" ${k === sel ? 'selected' : ''} ${k === 'hibernacao' && !hib && sel !== k ? 'disabled' : ''}>${esc(v)}</option>`).join('');
const estCls = k => (k === 'suspenso' ? 'er' : k === 'hibernacao' ? 'wa' : 'ok');

function vEf() {
  const hib = ST.config.permitir_hibernacao !== false;
  const L = ST.efemerides.filter(e => (!F.q || e.titulo.toLowerCase().includes(F.q.toLowerCase())) && (!F.tipo || e.tipo === F.tipo) && (!F.estado || e.estado === F.estado)).sort((a, b) => (a.next ? a.next.dias : 1e9) - (b.next ? b.next.dias : 1e9));
  $('#app').innerHTML = head('registo', 'As <em>efemérides</em>') + `<div class="bar"><input id="q" placeholder="Pesquisar…" value="${esc(F.q)}" style="max-width:240px"><select id="ft" style="max-width:230px"><option value="">Todos os tipos</option>${ST.tipos.map(t => `<option value="${t.id}" ${F.tipo === t.id ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}</select>
    <select id="fe" style="max-width:420px"><option value="">Todos os estados</option>${Object.entries(ST.estados).map(([k, v]) => `<option value="${k}" ${F.estado === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select><span class="sp"></span><button class="p" id="bn">+ Nova efeméride</button></div>
    <div class="tw"><table><tr><th>Data</th><th>Tipo</th><th>Título</th><th>Anos</th><th>Estado</th><th>Avisos</th></tr>${L.map(e => `<tr class="row" data-id="${e.id}"><td>${e.data ? fmt(e.data) : '<span class="chip er">sem data</span>'}${e.next ? `<div class="hint">próxima: ${fmt(e.next.data)} · ${e.next.dias <= 0 ? 'hoje' : e.next.dias + ' d'}</div>` : ''}</td><td>${esc(e.tipoNome)}</td><td>${esc(e.titulo)}</td><td>${anosTxt(e.anos)}</td><td><select class="est ${estCls(e.estado)}" data-id="${e.id}">${estOpts(e.estado, hib)}</select></td><td class="mt">${esc(e.avisos)}</td></tr>`).join('') || '<tr><td colspan="6" class="mt">Sem efemérides. Use «+ Nova efeméride».</td></tr>'}</table></div>`;
  $('#q').oninput = e => { F.q = e.target.value; vEf(); const q = $('#q'); q.focus(); q.setSelectionRange(F.q.length, F.q.length); };
  $('#ft').onchange = e => { F.tipo = e.target.value; vEf(); }; $('#fe').onchange = e => { F.estado = e.target.value; vEf(); }; $('#bn').onclick = () => openEf();
  document.querySelectorAll('tr.row').forEach(r => (r.onclick = ev => { if (!ev.target.closest('select')) openEf(r.dataset.id); }));
  document.querySelectorAll('select.est').forEach(s => (s.onchange = wrap(async () => { await api.setEstado(s.dataset.id, s.value); toast('Estado atualizado.'); render(); })));
}
function openEf(id) {
  const hib = ST.config.permitir_hibernacao !== false, e = ST.efemerides.find(x => x.id === id) || { titulo: '', tipo: ST.tipos[0].id, data: '', antecedencia: null, frequencia: '', texto: '', estado: 'ativo' };
  $('#dbody').innerHTML = `<h2 style="margin-top:0">${id ? 'Editar efeméride' : 'Nova efeméride'}</h2><div class="g2"><div><label>Data do acontecimento (ano original)</label><input type="date" id="f_data" value="${esc(e.data)}"></div><div><label>Tipo</label><select id="f_tipo">${ST.tipos.map(t => `<option value="${t.id}" ${e.tipo === t.id ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}</select><div class="hint" id="th"></div></div></div>
    <label>Título</label><input id="f_titulo" value="${esc(e.titulo)}">
    <label>Texto (opcional, máximo ${ST.maxPalavras} palavras) <span id="wc" class="hint"></span></label><textarea id="f_texto" rows="4">${esc(e.texto)}</textarea>
    <label>Anos de aniversário</label><div id="f_anos" style="font-size:18px">—</div>
    <h2>Avisos por e-mail</h2><div class="g2"><div><label>Antecedência (dias, mín. ${ST.minAnt}) — vazio = ${ST.config.antecedencia}</label><input type="number" id="f_ant" min="${ST.minAnt}" value="${e.antecedencia ?? ''}"></div><div><label>Frequência dos avisos</label><select id="f_freq"><option value="">Predefinida (${esc(ST.frequencias[ST.config.frequencia])})</option>${Object.entries(ST.frequencias).map(([k, v]) => `<option value="${k}" ${e.frequencia === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></div></div>
    <label>Estado</label><select id="f_est">${estOpts(e.estado, hib)}</select>
    <div class="hint">«Ativo (em hibernação)»: as notificações ficam adormecidas até ao ano seguinte e voltam sozinhas quando abre o período de avisos. «Suspenso (indefinidamente)»: só volta a avisar se mudar o estado.</div>
    <div class="err" id="err"></div><div class="row2" style="margin-top:.8rem"><button class="p" id="f_save">Guardar</button><button id="f_cancel">Cancelar</button>${id ? '<button id="f_del" class="er" style="margin-left:auto">Eliminar</button>' : ''}</div>`;
  const th = () => { const t = ST.tipos.find(x => x.id === $('#f_tipo').value); $('#th').textContent = t && t.exemplos ? 'ex.: ' + t.exemplos : ''; }; th(); $('#f_tipo').onchange = th;
  const palavras = () => { const t = $('#f_texto').value.trim(), n = t ? t.split(/\s+/).length : 0, w = $('#wc'); w.textContent = `${n}/${ST.maxPalavras}`; w.className = n > ST.maxPalavras ? 'hint er' : 'hint'; }; palavras(); $('#f_texto').oninput = palavras;
  const anos = async () => { try { const a = await api.anos($('#f_data').value); $('#f_anos').innerHTML = a ? anosTxt(a) : '—'; } catch { $('#f_anos').textContent = '—'; } }; anos(); $('#f_data').oninput = anos;
  $('#f_cancel').onclick = () => $('#dlg').close();
  $('#f_save').onclick = wrap(async () => { await api.saveEf({ id: e.id, titulo: $('#f_titulo').value, tipo: $('#f_tipo').value, data: $('#f_data').value, antecedencia: $('#f_ant').value, frequencia: $('#f_freq').value, texto: $('#f_texto').value, estado: $('#f_est').value }); $('#dlg').close(); render(); });
  if (id) $('#f_del').onclick = wrap(async () => { if (confirm('Eliminar esta efeméride? Deixa de ser avisada.')) { await api.deleteEf(id); $('#dlg').close(); render(); } });
  $('#dlg').showModal();
}
let FA = '';
async function vAnuario() {
  const M = await api.anuario(), cls = { ativo: 'ok', hibernacao: 'wa', suspenso: 'er' };
  $('#app').innerHTML = head('anuário', 'O <em>anuário</em>') + `<div class="bar fl"><button class="${FA ? '' : 'p'}" data-f="">Todos</button>${ST.tipos.map(t => `<button class="${FA === t.id ? 'p' : ''}" data-f="${t.id}">${esc(t.filtro || t.nome)}</button>`).join('')}</div>
    <div class="an">${M.map(m => { const L = m.itens.filter(i => !FA || i.tipo === FA); return `<section><h2>${m.nome}</h2>${L.length ? L.map(i => `<div class="ai ${cls[i.estado]}" data-id="${i.id}"><b>${i.dia}</b>, ${esc(i.titulo)}</div>`).join('') : '<div class="mt">—</div>'}</section>`; }).join('')}</div>`;
  document.querySelectorAll('[data-f]').forEach(b => (b.onclick = () => { FA = b.dataset.f; vAnuario(); }));
  document.querySelectorAll('.ai').forEach(a => (a.onclick = () => { openEf(a.dataset.id); }));
}
const MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'], dm = d => `${+d.slice(8)} de ${MES[+d.slice(5, 7) - 1]}`;
async function vAgenda() {
  const A = await api.agenda();
  const li = A.map(i => { const dia = i.inicio ? `<b>${+i.inicio.slice(8)}</b><span>${MES[+i.inicio.slice(5, 7) - 1].slice(0, 3).toUpperCase()}</span>` : '<b>—</b><span>SEM DATA</span>';
    const txt = i.tipo === 'aviso' ? `Avisos de ${dm(i.inicio)} a ${dm(i.data)} · ${esc(i.frequencia)} · ${i.total} e-mail${i.total > 1 ? 's' : ''}${i.emCurso ? ' · a decorrer' : ''}<br>Próximo aviso: ${fmt(i.proximo)}<br>Data a assinalar: ${dm(i.data)}${i.anos ? ` · ${i.anos.marco ? '★ ' : ''}${esc(i.anos.texto)}` : ''}` : i.tipo === 'hibernacao' ? `${esc(ST.estados.hibernacao)}<br>Adormecida até ${fmt(i.inicio)}` : 'Sem data: não gera avisos<br>Defina a data para ativar os avisos';
    return `<li class="it"><div class="d">${dia}</div><i class="dt${i.tipo === 'hibernacao' ? ' y' : i.tipo === 'sem-data' ? ' r' : ''}"></i><div><h2>${esc(i.titulo)}</h2><p>${txt}</p></div></li>`; }).join('');
  $('#app').innerHTML = head('agenda de avisos', 'Próximos <em>avisos</em>') + (A.length ? `<ol class="tl">${li}</ol>` : '<div class="em"><b>Sem avisos previstos</b><p>Registe uma efeméride com data e os avisos aparecem aqui.</p><button class="p" id="bn2">+ Nova efeméride</button></div>');
  if (!A.length) $('#bn2').onclick = async () => { tab = 'efemerides'; await render(); openEf(); };
}
async function vEstado() {
  const [em, hi] = await Promise.all([api.emails(), api.history()]), h = ST.health;
  const envio = u => (!u ? '<span class="mt">—</span>' : `<span class="chip ${u.envio === 'enviado' ? 'ok' : u.envio === 'falhou' ? 'er' : 'wa'}">${u.envio === 'pendente' && u.tentativas ? 'a repetir (' + u.tentativas + ')' : u.envio}</span>${u.erro ? `<div class="hint">${esc(u.erro)}</div>` : ''}`);
  $('#app').innerHTML = head('estado', 'Estado dos <em>avisos</em>') + `<div class="bar"><span class="sp"></span><button class="p" id="bt">Enviar e-mail de teste</button></div>
    ${h.problemas.length ? h.problemas.map(p => `<div class="prob ${p.nivel === 'erro' ? 'er' : 'wa'}">${esc(p.msg)}</div>`).join('') : '<div class="prob ok">Tudo a funcionar: o seu e-mail está indicado e não há envios pendentes.</div>'}
    ${h.recuperado ? `<div class="prob wa">${esc(h.recuperado)}</div>` : ''}<p class="hint">Última verificação: ${h.ultimaVerificacao ? new Date(h.ultimaVerificacao).toLocaleString('pt-PT') : '—'} · Último e-mail enviado: ${h.ultimoEnvio ? new Date(h.ultimoEnvio).toLocaleString('pt-PT') : '—'}</p>
    <h2>E-mails</h2><div class="tw"><table><tr><th>Efeméride</th><th>Estado</th><th>Último e-mail</th><th>Envio</th><th></th></tr>${em.map(r => `<tr><td>${esc(r.titulo)}<div class="hint">${esc(r.detalhe)}</div></td><td><span class="chip ${estCls(r.estado)}">${esc(r.estadoTxt)}</span></td><td>${r.ultimo ? new Date(r.ultimo.criado).toLocaleString('pt-PT') : '<span class="mt">ainda sem e-mails</span>'}</td><td>${envio(r.ultimo)}</td><td>${r.ultimo && r.ultimo.envio !== 'enviado' ? `<button data-r="${r.ultimo.id}">Reenviar</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="5" class="mt">Sem efemérides.</td></tr>'}</table></div>
    <h2>Histórico</h2><div class="tw" style="max-height:260px"><table>${hi.map(x => `<tr><td style="white-space:nowrap">${new Date(x.ts).toLocaleString('pt-PT')}</td><td><span class="chip ${x.tipo === 'falha' || x.tipo === 'perdido' ? 'er' : x.tipo === 'envio' ? 'ok' : 'mt'}">${x.tipo}</span></td><td>${esc(x.msg)}</td></tr>`).join('')}</table></div>`;
  $('#bt').onclick = wrap(async () => { await api.sendTest(); toast('E-mail de teste enviado.'); render(); });
  document.querySelectorAll('[data-r]').forEach(b => (b.onclick = wrap(async () => { await api.retry(b.dataset.r); render(); })));
}
function vDef() {
  const c = ST.config;
  $('#app').innerHTML = head('definições', '<em>Definições</em>') + `<div class="card"><b>Avisos</b><div class="g2"><div><label>O seu nome (aparece nos e-mails)</label><input id="d_nome" value="${esc(c.nome)}"></div><div><label>Hora de envio diário</label><input type="time" id="d_hora" value="${esc(c.hora)}"></div></div>
    <label>Destinatário (o seu e-mail)</label><input type="email" id="d_dest" value="${esc(c.destinatario)}" placeholder="nome@cm-mirandela.pt">
    <div class="g2"><div><label>Antecedência predefinida (dias; min. ${ST.minAnt})</label><input type="number" id="d_ant" min="${ST.minAnt}" value="${c.antecedencia}"></div><div><label>Frequência dos avisos</label><select id="d_freq">${Object.entries(ST.frequencias).map(([k, v]) => `<option value="${k}" ${c.frequencia === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></div></div>
    <label class="c"><input type="checkbox" id="d_hib" ${c.permitir_hibernacao !== false ? 'checked' : ''}> Deixar de avisar quando o utilizador suspender a efeméride no ano corrente.</label>
    <div class="hint">Todas as notificações suspendidas pelo utilizador ficam temporariamente adormecidas até ao ano seguinte, sendo automaticamente reativadas a ${c.antecedencia} dias da data da efeméride.</div></div>
    <div class="card"><b>Envio de e-mail</b><label>Enviar e-mail através de</label><div><b>Outlook clássico</b></div><div class="hint">Tem de estar instalado e com a sua conta configurada neste computador. Não funciona com o «novo Outlook».</div></div>
    <div class="card"><b>Windows</b><label class="c"><input type="checkbox" id="d_win" checked> Iniciar com o Windows (a correr em segundo plano)</label><p class="hint">Versão ${esc(ST.version)} · Criado por |ªLºP com recurso a IA para o Serviço de Património Cultural do Município de Mirandela</p></div>
    <div class="err" id="err"></div><button class="p" id="d_save">Guardar definições</button>`;
  $('#d_save').onclick = wrap(async () => { await api.saveConfig({ nome: $('#d_nome').value, hora: $('#d_hora').value, destinatario: $('#d_dest').value, antecedencia: $('#d_ant').value, frequencia: $('#d_freq').value, permitir_hibernacao: $('#d_hib').checked, iniciarComWindows: $('#d_win').checked }); toast('Definições guardadas.'); render(); });
}
render();
