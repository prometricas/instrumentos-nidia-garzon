let D = null; // datos: {participantes, eqi, esms, cff, bitacora}
let vista = 'estudiantes';
const porGrupo = (lista) => GRUPOS.map((g) => [g, lista.filter((x) => x.grupo === g)]).filter(([, l]) => l.length);
const DESC = { Piloto: 'Grupo de prueba de los instrumentos: sirve para ensayar la aplicación y ajustar los cuestionarios; sus datos no entran en el análisis principal.', Experimental: 'Grupo que recibe la intervención pedagógica basada en el desarrollo socioemocional, con medición antes (pretest) y después (postest).', Control: 'Grupo que no recibe la intervención pedagógica; se mide en los mismos momentos para comparar.' };
let grupoActivo = localStorage.getItem('grupoActivo') || 'Piloto';
function tabsGrupo(lista, cuenta, extra = '') {
  return `<div class="gbar"><div class="gtabs">${GRUPOS.map((g) => `<button data-g="${g}" class="g-${g.toLowerCase()} ${g === grupoActivo ? 'activo' : ''}">${g}<b>${cuenta(lista.filter((x) => x.grupo === g))}</b></button>`).join('')}</div><p class="gdesc g-${grupoActivo.toLowerCase()}">${DESC[grupoActivo]}</p>${extra}</div>`;
}
// filtro por nombre o código sobre las filas de una tabla ya dibujada (sin volver a dibujar, para no perder el foco)
function filtrarFilas(input, tabla, msg) {
  const q = input.value.trim().toLowerCase(); let n = 0;
  tabla.querySelectorAll('tbody tr').forEach((tr) => { const ok = !q || tr.textContent.toLowerCase().includes(q); tr.classList.toggle('oculto', !ok); n += ok; });
  if (msg) msg.textContent = q ? `${n} coincidencia${n === 1 ? '' : 's'}` : '';
}
function activarTabs(cont, onChange) { cont.querySelectorAll('.gtabs button').forEach((b) => b.addEventListener('click', () => { grupoActivo = b.dataset.g; localStorage.setItem('grupoActivo', grupoActivo); onChange(); })); }
const KEYDE = { eqi: 'EQI', esms: 'ESMS', cff: 'CFF' };
const nom = (p) => [p.nombre, p.apellido].filter(Boolean).join(' ');
const codigoUsado = (c) => D.participantes.some((p) => p.codigo === c) || (D.papelera || []).some((p) => p.codigo === c);
const nombreDe = (c) => { const p = D.participantes.find((p) => p.codigo === c); return p ? nom(p) : ''; };
const reg = (s, c, m) => D[s].find((r) => r.codigo === c && (s === 'cff' || r.momento === m));
const nReg = (c) => ['eqi', 'esms', 'cff'].reduce((a, s) => a + D[s].filter((r) => r.codigo === c).length, 0);
function papeleraHtml() {
  const L = D.papelera || []; if (!L.length) return '';
  return `<details class="papelera"><summary>Papelera: ${L.length} estudiante${L.length > 1 ? 's' : ''} eliminado${L.length > 1 ? 's' : ''} con sus registros guardados</summary><ul>${L.map((x) => `<li><span><b>${esc(x.codigo)}</b> ${esc(nom(x))} · ${x.registros} registro${x.registros === 1 ? '' : 's'} · eliminado el ${esc(x.fecha_papelera)}</span><button class="btn chico sec" data-rest="${esc(x.codigo)}">Recuperar</button><button class="btn chico" style="background:#fff;color:var(--mal);border:1px solid #EFC6C2" data-purga="${esc(x.codigo)}">Borrar definitivamente</button></li>`).join('')}</ul></details>`;
}

/* ---------- entrada ---------- */
async function entrar(clave) {
  sessionStorage.setItem('clave', clave);
  try { await api('entrar', { method: 'POST', body: { clave } }); }
  catch (e) { sessionStorage.removeItem('clave'); throw e; }
  await cargar();
  $('#entrada').classList.add('oculto'); $('#app').classList.remove('oculto');
  ir(VISTAS[location.hash.slice(1)] ? location.hash.slice(1) : 'estudiantes');
  pintarCola(); enviarCola();
  if (leerAvance() && vista !== 'aplicar') toast('Hay una aplicación sin terminar guardada en este dispositivo (en Aplicar al estudiante)');
}
$('#btnEntrar').addEventListener('click', async () => {
  const c = $('#clave').value; if (!c) return;
  $('#btnEntrar').disabled = true;
  try { await entrar(c); } catch (e) { $('#entradaMsg').innerHTML = `<div class="aviso mal">${esc(e.message)}</div>`; }
  $('#btnEntrar').disabled = false;
});
$('#clave').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#btnEntrar').click(); });
$('#btnSalir').addEventListener('click', () => { sessionStorage.removeItem('clave'); location.reload(); });
async function cargar() {
  $('#cargando').classList.remove('oculto');
  try { const [d, p] = await Promise.all([api('datos'), api('papelera')]); D = d; D.papelera = p.papelera; }
  finally { $('#cargando').classList.add('oculto'); }
}
/* ---------- diálogo propio (reemplaza confirm/prompt del navegador) ---------- */
function dialogo({ titulo, texto, ok = 'Aceptar', cancelar = 'Cancelar', peligro = false, escribir = null }) {
  return new Promise((res) => {
    $('#dTitulo').textContent = titulo; $('#dTexto').textContent = texto;
    $('#dCampo').classList.toggle('oculto', !escribir); $('#dCampo').classList.remove('falta'); $('#dInput').value = '';
    if (escribir) $('#dLabel').textContent = `Para confirmar, escriba ${escribir}`;
    $('#dOk').textContent = ok; $('#dOk').className = 'btn' + (peligro ? ' peligro' : ''); $('#dCancelar').textContent = cancelar;
    $('#dialogo').classList.remove('oculto');
    const coincide = () => !escribir || $('#dInput').value.trim().toUpperCase() === escribir.toUpperCase();
    const fin = (v) => { $('#dialogo').classList.add('oculto'); $('#dOk').onclick = $('#dCancelar').onclick = null; document.removeEventListener('keydown', tecla, true); res(v); };
    const tecla = (e) => { if (e.key === 'Escape') { e.stopPropagation(); fin(false); } else if (e.key === 'Enter') { e.stopPropagation(); if (coincide()) fin(true); else $('#dCampo').classList.add('falta'); } };
    $('#dOk').onclick = () => { if (!coincide()) { $('#dCampo').classList.add('falta'); $('#dInput').focus(); return; } fin(true); };
    $('#dCancelar').onclick = () => fin(false);
    document.addEventListener('keydown', tecla, true);
    (escribir ? $('#dInput') : $('#dOk')).focus();
  });
}
$('#dialogo').addEventListener('click', (e) => { if (e.target === $('#dialogo')) $('#dCancelar').click(); });

/* ---------- navegación ---------- */
const VISTAS = { estudiantes: () => verEstudiantes(), aplicar: () => verAplicar(), familias: () => verFamilias(), respuestas: () => verRespuestas() };
let origen = null; // módulo desde el que se llegó con una marca pendiente, para poder volver
function ir(v) {
  vista = v;
  document.querySelectorAll('main > section').forEach((s) => s.classList.toggle('oculto', s.id !== 'v-' + v));
  document.querySelectorAll('nav.menu button').forEach((b) => b.classList.toggle('activo', b.dataset.v === v));
  document.querySelectorAll('[data-volver]').forEach((a) => a.classList.toggle('oculto', !(origen && origen !== v)));
  $('#ayudaBtn').classList.toggle('oculto', v !== 'aplicar'); if (v !== 'aplicar') $('#ayudaPanel').classList.add('oculto');
  if (!location.hash) history.replaceState(null, '', '#' + v); else if (location.hash !== '#' + v) history.pushState(null, '', '#' + v); // el botón Atrás del navegador vuelve al módulo anterior
  VISTAS[v]();
}
document.querySelectorAll('nav.menu button').forEach((b) => b.addEventListener('click', () => { origen = null; ir(b.dataset.v); }));
document.querySelectorAll('[data-volver]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); const o = origen; origen = null; ir(o); }));
window.addEventListener('popstate', () => {
  if (K) { history.pushState(null, '', '#aplicar'); return; } // durante una aplicación, Atrás no hace nada
  const v = location.hash.slice(1); if (VISTAS[v] && D) { origen = null; ir(v); }
});
async function recargar() { try { await cargar(); ir(vista); } catch (e) { toast(e.message, true); } }
function seg(id, onChange) { const el = $(id); el.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { el.querySelectorAll('button').forEach((x) => x.classList.toggle('activo', x === b)); onChange && onChange(b.dataset.m); })); return () => el.querySelector('.activo').dataset.m; }
function guionHtml(ins) { return `<h4>Guion · ${esc(ins.corto)}</h4><p>Diga al niño(a): <i>«${esc(ins.guion.diga)}»</i></p><p>${esc(ins.guion.haga)}</p><p class="teclas">Teclas: 1-${ins.escala.length} marcan la respuesta, tecla Enter avanza.</p>`; }

/* ---------- estudiantes ---------- */
function verEstudiantes() {
  const ps = D.participantes;
  $('#resumenP').textContent = ps.length ? `${ps.length} estudiante${ps.length > 1 ? 's' : ''} · ` + porGrupo(ps).map(([g, l]) => `${l.length} ${g.toLowerCase()}`).join(' · ') : '';
  const marcaF = (c) => { const r = reg('cff', c); return r ? `<span class="estado si" role="button" tabindex="0" data-s="cff" data-c="${esc(c)}" title="Respondido el ${esc(r.fecha)}. Pulse para ver la ficha">✓ ${esc(r.informante)}</span>` : '<span class="estado pend" role="button" tabindex="0" data-fam title="Pendiente. Pulse para ir a los enlaces de acudientes">Pendiente</span>'; };
  const marca = (s, c, m) => { const r = reg(s, c, m); const et = m === 'Pretest' ? 'Pre' : 'Post'; return r ? `<span class="estado si" role="button" tabindex="0" data-s="${s}" data-c="${esc(c)}" data-m="${m}" title="Guardado el ${esc(r.fecha)}. Pulse para ver la ficha">${et} ✓</span>` : `<span class="estado pend" role="button" tabindex="0" data-apl="${s}" data-c="${esc(c)}" data-m="${m}" title="Sin aplicar. Pulse para aplicar ahora">${et} ·</span>`; };
  const filaP = (p) => { const n = nReg(p.codigo); return `<tr><td><b>${esc(p.codigo)}</b></td><td><a href="#" data-ficha="${esc(p.codigo)}" title="Abrir la ficha del estudiante">${esc(nom(p))}</a></td><td>${esc(p.sexo)}</td><td>${esc(p.edad)}</td>` +
      ['eqi', 'esms'].map((s) => `<td>${marca(s, p.codigo, 'Pretest')}${marca(s, p.codigo, 'Postest')}</td>`).join('') + `<td>${marcaF(p.codigo)}</td>` +
      `<td><button class="x ${n ? 'con-datos' : ''}" data-del="${esc(p.codigo)}" title="${n ? `Eliminar (tiene ${n} registros; se guardan en la papelera)` : 'Eliminar estudiante'}">×</button></td></tr>`; };
  const lista = ps.filter((p) => p.grupo === grupoActivo);
  const buscar = lista.length > 5 ? `<div class="buscar"><input id="pBuscar" placeholder="Buscar por nombre o código" aria-label="Buscar estudiante"><span id="pBuscarN"></span></div>` : '';
  $('#tablaP').innerHTML = tabsGrupo(ps, (l) => l.length, buscar) + (lista.length ? `<table class="datos"><thead><tr><th>Código</th><th>Nombre</th><th>Sexo</th><th>Edad</th>` +
    ['EQI', 'ESMS', 'CFF'].map((k) => `<th>${esc(INS[k].tabla)}<small>${esc(INS[k].nombre)}</small></th>`).join('') + `<th></th></tr></thead><tbody>` + lista.map(filaP).join('') + '</tbody></table>'
    : `<div class="aviso nota">Aún no hay estudiantes en el grupo ${grupoActivo}. Regístrelos con el formulario de arriba.</div>`) + papeleraHtml();
  activarTabs($('#tablaP'), verEstudiantes);
  $('#pBuscar')?.addEventListener('input', () => filtrarFilas($('#pBuscar'), $('#tablaP table'), $('#pBuscarN')));
  const cod = $('#pCodigo').value.trim().toUpperCase();
  if (!cod || codigoUsado(cod)) { const n = Math.max(0, ...ps.concat(D.papelera || []).map((p) => Number((p.codigo.match(/^E(\d+)$/) || [])[1]) || 0)) + 1; $('#pCodigo').value = 'E' + z(n); } // siguiente al mayor usado: un código nunca se repite
  $('#tablaP').querySelectorAll('.estado.si, [data-ficha]').forEach((ch) => ch.addEventListener('click', () => verEstudiante(ch.dataset.c || ch.dataset.ficha)));
  $('#tablaP').querySelectorAll('[data-apl]').forEach((ch) => ch.addEventListener('click', () => irAplicar(KEYDE[ch.dataset.apl], ch.dataset.c, ch.dataset.m)));
  $('#tablaP').querySelectorAll('[data-fam]').forEach((ch) => ch.addEventListener('click', () => { origen = 'estudiantes'; ir('familias'); }));
  $('#tablaP').querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    const c = b.dataset.del, n = nReg(c);
    const ok = n ? await dialogo({ titulo: 'Eliminar estudiante', texto: `${c} ${nombreDe(c)} tiene ${n} registro${n > 1 ? 's' : ''} guardado${n > 1 ? 's' : ''}. El estudiante y sus registros pasan a la papelera, desde donde puede recuperarlos.`, ok: 'Mover a la papelera', peligro: true, escribir: c })
      : await dialogo({ titulo: 'Eliminar estudiante', texto: `¿Eliminar a ${c} ${nombreDe(c)}? No tiene registros guardados.`, ok: 'Eliminar', peligro: true });
    if (!ok) return;
    try { await api(`participante?codigo=${c}`, { method: 'DELETE' }); toast(n ? 'Movido a la papelera con sus registros' : 'Estudiante eliminado'); await recargar(); } catch (e) { toast(e.message, true); }
  }));
  $('#tablaP').querySelectorAll('[data-rest]').forEach((b) => b.addEventListener('click', async () => {
    try { await api('restaurar', { method: 'POST', body: { codigo: b.dataset.rest } }); toast('Estudiante recuperado con sus registros'); await recargar(); } catch (e) { toast(e.message, true); }
  }));
  $('#tablaP').querySelectorAll('[data-purga]').forEach((b) => b.addEventListener('click', async () => {
    const c = b.dataset.purga;
    if (!(await dialogo({ titulo: 'Borrar definitivamente', texto: `Esto borra para siempre a ${c} ${nom(D.papelera.find((x) => x.codigo === c) || {})} y sus registros de la papelera. No se puede deshacer.`, ok: 'Borrar definitivamente', peligro: true, escribir: c }))) return;
    try { await api(`papelera?codigo=${c}`, { method: 'DELETE' }); toast('Borrado definitivamente'); await recargar(); } catch (e) { toast(e.message, true); }
  }));
}
['#pGrupo', '#pSexo'].forEach((id) => $(id).addEventListener('change', () => $(id).classList.toggle('vacio', !$(id).value)));
document.querySelectorAll('#v-estudiantes .campo input, #v-estudiantes .campo select').forEach((el) => el.addEventListener('input', () => el.closest('.campo').classList.remove('falta')));
$('#btnAddP').addEventListener('click', async () => {
  const row = { codigo: $('#pCodigo').value.trim().toUpperCase(), nombre: $('#pNombre').value.trim(), apellido: $('#pApellido').value.trim(), grupo: $('#pGrupo').value, sexo: $('#pSexo').value, edad: $('#pEdad').value };
  const m = $('#pMsg'), faltan = [];
  document.querySelectorAll('#v-estudiantes .campo').forEach((c) => c.classList.remove('falta'));
  const falta = (id, texto) => { $(id).closest('.campo').classList.add('falta'); faltan.push(texto); };
  if (!row.codigo) falta('#pCodigo', 'el código');
  else if (!/^[A-Z0-9]{1,8}$/.test(row.codigo)) falta('#pCodigo', 'un código válido (solo letras y números, máximo 8)');
  else if (D.participantes.some((p) => p.codigo === row.codigo)) falta('#pCodigo', `otro código (${row.codigo} ya existe)`);
  else if ((D.papelera || []).some((p) => p.codigo === row.codigo)) falta('#pCodigo', `otro código (${row.codigo} está en la papelera)`);
  if (!row.nombre) falta('#pNombre', 'el nombre');
  if (!row.apellido) falta('#pApellido', 'el apellido');
  if (!row.grupo) falta('#pGrupo', 'el grupo');
  if (!row.sexo) falta('#pSexo', 'el sexo');
  if (!row.edad) falta('#pEdad', 'la edad');
  if (faltan.length) { m.innerHTML = `<div class="aviso mal">Falta ${faltan.join(', ').replace(/, ([^,]*)$/, ' y $1')}.</div>`; $('#v-estudiantes .campo.falta input, #v-estudiantes .campo.falta select')?.focus(); return; }
  try {
    await api('participante', { method: 'PUT', body: { row, nuevo: true } });
    m.innerHTML = `<div class="aviso ok">Registrado ${esc(row.codigo)} · ${esc(row.nombre)} ${esc(row.apellido)}.</div>`;
    $('#pCodigo').value = ''; $('#pNombre').value = ''; $('#pApellido').value = ''; $('#pEdad').value = ''; $('#pSexo').value = ''; $('#pSexo').classList.add('vacio'); grupoActivo = row.grupo; localStorage.setItem('grupoActivo', grupoActivo);
    await recargar(); $('#pNombre').focus();
  } catch (e) { m.innerHTML = `<div class="aviso mal">${esc(e.message)}</div>`; }
});

/* ---------- ficha del estudiante ---------- */
const fmtDur = (seg) => (seg >= 90 ? `${Math.round(seg / 60)} min` : `${seg} s`);
function dimLabel(p) { const r = (p.etiqueta.match(/(\d+-\d+)\)\s*$/) || [])[1]; return `<span title="${esc(p.etiqueta)}">${esc(p.corto || p.etiqueta)}${r ? ` <small>${r}</small>` : ''}</span>`; }
function avatar(sexo) { // niño o niña según el sexo registrado
  const nina = sexo === 'Femenino', pelo = '#4A3222', piel = '#F5C9A6', ropa = nina ? '#F36A00' : '#1F4FA8', id = nina ? 'av-f' : 'av-m';
  return `<svg class="avatar" viewBox="0 0 64 64" aria-hidden="true"><defs><clipPath id="${id}"><circle cx="32" cy="32" r="31"/></clipPath></defs><circle cx="32" cy="32" r="31" fill="#E8EEF9"/><g clip-path="url(#${id})">
    <path d="M10 66c0-12 10-19 22-19s22 7 22 19z" fill="${ropa}"/>${nina ? `<path d="M16 31c0-12 7-19 16-19s16 7 16 19v16H16z" fill="${pelo}"/>` : ''}
    <circle cx="32" cy="29" r="12.5" fill="${piel}"/>
    ${nina ? `<path d="M19.5 29.5c0-9.5 5.5-14.5 12.5-14.5s12.5 5 12.5 14.5c-3-5-6-7-9-7-3 2-7 2-10 0-3 0-5 2-6 7z" fill="${pelo}"/>` : `<path d="M19.5 28c0-9 5.5-13.5 12.5-13.5S44.5 19 44.5 28c-3-4.5-6-6.5-9-6.5-3 2-7 2-10 0-3 0-5 2-6 6.5z" fill="${pelo}"/>`}
    <circle cx="27.5" cy="30.5" r="1.6" fill="#1C2433"/><circle cx="36.5" cy="30.5" r="1.6" fill="#1C2433"/><path d="M28 35.5q4 3 8 0" stroke="#1C2433" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <circle cx="24" cy="34.5" r="2" fill="#F08A8A" opacity=".45"/><circle cx="40" cy="34.5" r="2" fill="#F08A8A" opacity=".45"/></g></svg>`;
}
function fichaPrueba(key, codigo) {
  const ins = INS[key], s = STORE[key], panel = key !== 'CFF';
  const regs = panel ? MOMENTOS.map((m) => reg(s, codigo, m)) : [reg(s, codigo)];
  const cab = panel ? '<th></th><th>Pretest</th><th>Postest</th><th title="Postest menos pretest">Cambio</th>' : '<th></th><th>Puntaje</th>';
  const filas = ins.puntajes.map((p) => {
    const v = regs.map((r) => (r ? r[p.variable] : null)), camb = panel && v[0] != null && v[1] != null ? v[1] - v[0] : null;
    return `<tr><td>${dimLabel(p)}</td>${v.map((x) => `<td>${x ?? '<span class="nada">–</span>'}</td>`).join('')}${panel ? `<td class="camb ${camb > 0 ? 'mas' : camb < 0 ? 'menos' : ''}">${camb == null ? '' : (camb > 0 ? '+' : '') + camb}</td>` : ''}</tr>`;
  }).join('');
  const obs = (r) => (r.observaciones ? ` · <i>${esc(r.observaciones)}</i>` : '');
  const borrar = (m) => `<button class="lnk chico mal" data-borrar data-s="${s}" data-c="${esc(codigo)}" data-m="${m || ''}">Eliminar</button>`;
  const meta = panel
    ? MOMENTOS.map((m, i) => { const r = regs[i]; return `<div class="meta"><span><b>${m}</b> ${r ? `${esc(r.fecha_hora || r.fecha)} · aplicó ${esc(r.aplicador)} · ${fmtDur(r.duracion_seg)}${obs(r)}` : 'sin aplicar'}</span>${r ? borrar(m) : `<button class="lnk chico" data-aplicar data-k="${key}" data-c="${esc(codigo)}" data-m="${m}">Aplicar ahora</button>`}</div>`; }).join('')
    : (regs[0] ? `<div class="meta"><span><b>Respondió</b> ${esc(regs[0].informante)} · ${esc(regs[0].fecha_hora || regs[0].fecha)}${regs[0].consentimiento ? ' · aceptó el consentimiento' : ''}${obs(regs[0])}</span>${borrar()}</div>` : `<div class="meta"><span><b>Pendiente</b> · el acudiente aún no responde</span><button class="lnk chico" data-acudientes>Ir a Acudientes</button></div>`);
  return `<div class="prueba"><h3>${esc(ins.corto)}<span>${esc(ins.nombre)}</span></h3><table class="dims"><thead><tr>${cab}</tr></thead><tbody>${filas}</tbody></table>${meta}</div>`;
}
function verEstudiante(codigo, editar = false) {
  const p = D.participantes.find((x) => x.codigo === codigo); if (!p) return;
  const op = (lista, v) => lista.map((x) => `<option ${x === v ? 'selected' : ''}>${x}</option>`).join('');
  $('#fichaCuerpo').innerHTML = `<div class="ficha-cab">${avatar(p.sexo)}<div><h2><a href="#" data-editar title="Editar los datos del estudiante">${esc(nom(p))}</a> <span class="gtag g-${p.grupo.toLowerCase()}">${esc(p.grupo)}</span><a href="#" class="editar-lnk" data-editar>${editar ? 'Cerrar edición' : 'Editar estudiante'}</a></h2>
    <p class="guia" style="margin:0">${esc(p.codigo)} · ${esc(p.sexo)} · ${esc(p.edad)} años · registrado el ${esc(p.fecha_registro)}${p.observaciones ? ` · ${esc(p.observaciones)}` : ''}</p>
    <p class="guia consent ${p.consentimiento ? '' : 'falta'}" style="margin:2px 0 0">${p.consentimiento ? `Consentimiento del acudiente: ${esc(p.consentimiento)}` : 'Sin consentimiento del acudiente registrado'} · ${p.asentimiento ? `asentimiento del estudiante: ${esc(p.asentimiento)}` : 'sin asentimiento registrado'}</p></div></div>
    <form class="editar ${editar ? '' : 'oculto'}" id="fichaEdit"><div class="fila">
      <div class="campo" style="flex:1.4"><label for="eNombre">Nombre</label><input id="eNombre" value="${esc(p.nombre)}"></div>
      <div class="campo" style="flex:1.4"><label for="eApellido">Apellido</label><input id="eApellido" value="${esc(p.apellido)}"></div>
      <div class="campo"><label for="eGrupo">Grupo</label><select id="eGrupo">${op(GRUPOS, p.grupo)}</select></div>
      <div class="campo"><label for="eSexo">Sexo</label><select id="eSexo">${op(['Femenino', 'Masculino'], p.sexo)}</select></div>
      <div class="campo" style="max-width:90px"><label for="eEdad">Edad</label><input id="eEdad" type="number" min="5" max="12" value="${esc(p.edad)}"></div></div>
      <div class="fila" style="margin-top:10px">
      <div class="campo" style="flex:2"><label for="eObs">Observaciones (opcional)</label><input id="eObs" value="${esc(p.observaciones || '')}" placeholder="Por ejemplo: repite el grado, usa gafas, se retiró en octubre"></div>
      <div class="campo" style="max-width:220px"><label for="eCons">Consentimiento del acudiente (fecha)</label><input id="eCons" type="date" value="${esc(p.consentimiento || '')}"></div>
      <div class="campo" style="max-width:220px"><label for="eAsen">Asentimiento del estudiante (fecha)</label><input id="eAsen" type="date" value="${esc(p.asentimiento || '')}"></div></div>
      <p class="guia" style="margin:10px 0;font-size:.88em">El código ${esc(p.codigo)} no se cambia: es el identificador que une todas sus aplicaciones.</p>
      <div class="fila"><button class="btn" type="submit" id="eGuardar">Guardar cambios</button><button class="btn sec" type="button" id="eCancelar">Cancelar</button></div><div id="eMsg" style="margin-top:10px"></div></form>
    <div class="pruebas">${['EQI', 'ESMS', 'CFF'].map((k) => fichaPrueba(k, codigo)).join('')}</div>`;
  $('#ficha').classList.remove('oculto');
  $('#fichaCuerpo').querySelectorAll('[data-editar]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); verEstudiante(codigo, !editar); if (!editar) $('#eNombre').focus(); }));
  $('#eCancelar').addEventListener('click', () => verEstudiante(codigo, false));
  $('#fichaEdit').addEventListener('submit', async (e) => {
    e.preventDefault();
    const row = { ...p, nombre: $('#eNombre').value.trim(), apellido: $('#eApellido').value.trim(), grupo: $('#eGrupo').value, sexo: $('#eSexo').value, edad: $('#eEdad').value, observaciones: $('#eObs').value.trim(), consentimiento: $('#eCons').value, asentimiento: $('#eAsen').value };
    if (!row.nombre || !row.apellido || !row.edad) return ($('#eMsg').innerHTML = '<div class="aviso mal">Nombre, apellido y edad son obligatorios.</div>');
    try { await api('participante', { method: 'PUT', body: { row } }); toast('Datos actualizados'); await cargar(); verEstudiante(codigo, false); ir(vista); } catch (err) { $('#eMsg').innerHTML = `<div class="aviso mal">${esc(err.message)}</div>`; }
  });
  $('#fichaCuerpo').querySelectorAll('[data-aplicar]').forEach((b) => b.addEventListener('click', () => irAplicar(b.dataset.k, b.dataset.c, b.dataset.m)));
  $('#fichaCuerpo').querySelectorAll('[data-acudientes]').forEach((b) => b.addEventListener('click', () => { $('#ficha').classList.add('oculto'); origen = 'estudiantes'; grupoActivo = p.grupo; localStorage.setItem('grupoActivo', grupoActivo); ir('familias'); }));
  $('#fichaCuerpo').querySelectorAll('[data-borrar]').forEach((b) => b.addEventListener('click', async () => {
    const { s, c, m } = b.dataset, k = KEYDE[s];
    if (!(await dialogo({ titulo: 'Eliminar registro', texto: `Se elimina "${INS[k].corto}"${m ? ' (' + m + ')' : ''} de ${c} ${nombreDe(c)}. Esta acción no se puede deshacer.`, ok: 'Eliminar', peligro: true }))) return;
    try { await api(`registro?store=${s}&codigo=${c}${m ? '&momento=' + m : ''}`, { method: 'DELETE' }); toast('Registro eliminado'); await cargar(); verEstudiante(c); ir(vista); } catch (e) { toast(e.message, true); }
  }));
}
$('#fichaCerrar').addEventListener('click', () => $('#ficha').classList.add('oculto'));
$('#ficha').addEventListener('click', (e) => { if (e.target === $('#ficha')) $('#ficha').classList.add('oculto'); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('#ficha').classList.add('oculto'); if (e.key === 'Enter' && e.target.matches('.estado[tabindex]')) e.target.click(); });
document.addEventListener('click', (e) => { if (e.target.matches('[data-ficha]')) e.preventDefault(); });

/* ---------- aplicar ---------- */
let insKey = 'EQI', preApl = null;
const momA = seg('#aMom');
function elegirIns(k) { insKey = k; $('#opIns').querySelectorAll('button').forEach((x) => x.classList.toggle('activo', x.dataset.k === k)); $('#ayudaPanel').innerHTML = guionHtml(INS[k]); }
function irAplicar(key, codigo, momento) { preApl = { key, codigo, momento }; $('#ficha').classList.add('oculto'); origen = 'estudiantes'; ir('aplicar'); }
$('#opIns').innerHTML = ['EQI', 'ESMS'].map((k) => `<button data-k="${k}" class="${k === insKey ? 'activo' : ''}"><b>${esc(INS[k].corto)}</b><span>${esc(INS[k].tecnico)}</span></button>`).join('');
$('#opIns').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => elegirIns(b.dataset.k)));
$('#ayudaBtn').addEventListener('click', () => { $('#ayudaPanel').innerHTML = guionHtml(INS[insKey]); $('#ayudaPanel').classList.toggle('oculto'); });
function llenarSelEst(q = '') {
  const sel = $('#aCod'), prev = sel.value, ql = q.trim().toLowerCase();
  const lista = D.participantes.filter((p) => !ql || `${p.codigo} ${nom(p)}`.toLowerCase().includes(ql));
  sel.innerHTML = porGrupo(lista).map(([g, l]) => `<optgroup label="${g}">` + l.map((p) => `<option value="${esc(p.codigo)}">${esc(p.codigo)} · ${esc(nom(p))}</option>`).join('') + '</optgroup>').join('') || `<option value="">${ql ? '(sin coincidencias)' : '(registre estudiantes primero)'}</option>`;
  if (prev && [...sel.options].some((o) => o.value === prev)) sel.value = prev;
}
$('#aBuscar').addEventListener('input', () => llenarSelEst($('#aBuscar').value));
function verAplicar() {
  $('#aBuscar').value = ''; llenarSelEst();
  const sel = $('#aCod');
  if (preApl) { elegirIns(preApl.key); sel.value = preApl.codigo; $('#aMom').querySelectorAll('button').forEach((b) => b.classList.toggle('activo', b.dataset.m === preApl.momento)); preApl = null; $('#aMsg').innerHTML = ''; }
  if (!$('#aApl').value) $('#aApl').value = localStorage.getItem('aplicador') || '';
  avisoAvance();
}
// aplicación sin terminar guardada en este dispositivo (por si se cerró el navegador o se agotó la batería)
function leerAvance() { try { const a = JSON.parse(localStorage.getItem('avance') || 'null'); return a && INS[a.key] && D.participantes.some((p) => p.codigo === a.codigo) ? a : null; } catch { return null; } }
function avisoAvance() {
  const a = leerAvance(), el = $('#aAvance');
  if (!a) { el.classList.add('oculto'); el.innerHTML = ''; return; }
  const hechas = Object.keys(a.resp).filter((k) => INS[a.key].items.some((it) => it.codigo === k)).length;
  el.innerHTML = `<div class="aviso nota" style="margin:0"><b>Aplicación sin terminar:</b> ${esc(INS[a.key].corto)} de ${esc(a.codigo)} ${esc(nombreDe(a.codigo))}, ${esc(a.momento)} · ${hechas} de ${INS[a.key].items.length} frases respondidas · ${esc(a.fecha)} <span class="fila" style="display:inline-flex;gap:8px;margin-left:10px"><button class="btn chico" id="btnContinuar">Continuar</button><button class="btn chico sec" id="btnDescartarAvance">Descartar</button></span></div>`;
  el.classList.remove('oculto');
  $('#btnContinuar').addEventListener('click', () => { const a = leerAvance(); if (a) startKid({ key: a.key, codigo: a.codigo, momento: a.momento, aplicador: a.aplicador }, a); });
  $('#btnDescartarAvance').addEventListener('click', async () => { if (await dialogo({ titulo: 'Descartar aplicación sin terminar', texto: 'Se borran las respuestas guardadas en este dispositivo.', ok: 'Descartar', peligro: true })) { localStorage.removeItem('avance'); avisoAvance(); } });
}
$('#btnStart').addEventListener('click', async () => {
  const codigo = $('#aCod').value, momento = momA(), apl = $('#aApl').value.trim(), m = $('#aMsg');
  if (!codigo) return (m.innerHTML = '<div class="aviso mal">Registre al estudiante antes de aplicar.</div>');
  if (!apl) return (m.innerHTML = '<div class="aviso mal">Escriba el nombre del aplicador.</div>');
  localStorage.setItem('aplicador', apl);
  const prev = reg(STORE[insKey], codigo, momento);
  if (prev && !(await dialogo({ titulo: 'Ya existe esta aplicación', texto: `${codigo} ${nombreDe(codigo)} ya tiene "${INS[insKey].corto}" en ${momento} (${prev.fecha}). Si continúa, al guardar se reemplazará ese registro.`, ok: 'Continuar y reemplazar' }))) return;
  const a = leerAvance();
  if (a && a.key === insKey && a.codigo === codigo && a.momento === momento && (await dialogo({ titulo: 'Aplicación sin terminar', texto: 'Hay un avance guardado de esta misma aplicación en este dispositivo.', ok: 'Continuar donde iba', cancelar: 'Empezar de nuevo' }))) return startKid({ key: insKey, codigo, momento, aplicador: apl }, a);
  m.innerHTML = ''; startKid({ key: insKey, codigo, momento, aplicador: apl });
});

/* ---------- pantalla del niño ---------- */
let K = null;
function startKid(cfg, avance = null) {
  const ins = INS[cfg.key];
  K = { ...cfg, ins, seq: ins.practica.map((p) => ({ ...p, prac: true })).concat(ins.items), i: avance ? Math.min(avance.i, ins.practica.length + ins.items.length - 1) : 0, resp: avance ? avance.resp : {}, t0: avance ? Date.now() - (avance.transcurrido || 0) : Date.now() };
  $('#kTag').innerHTML = `<b>${esc(ins.corto)}</b> · ${esc(ins.nombre)} · ${esc(cfg.codigo)} ${esc(nombreDe(cfg.codigo))} · ${esc(cfg.momento)}`;
  $('#kAyudaPanel').innerHTML = guionHtml(ins); $('#kAyudaPanel').classList.add('oculto');
  $('#kid').classList.remove('oculto'); $('#app').classList.add('oculto');
  renderKid();
}
function renderKid() {
  const { ins, seq, i, resp } = K, it = seq[i], nIt = ins.items.length, done = Math.max(0, i - ins.practica.length);
  $('#kProg').style.width = (100 * done / nIt) + '%';
  $('#kCount').textContent = it.prac ? '' : `${done + 1} de ${nIt}`; // en las frases de práctica no se muestra contador
  const icon = ins.id === 'EQI' ? iconSure : iconFace;
  const frase = '"' + it.texto.replace(/\.\s*$/, '') + '"';
  $('#kBody').innerHTML = `<p class="kid-q">${esc(ins.pregunta)}</p><p class="kid-stmt ${it.prac ? 'prac' : ''}">${esc(frase)}</p>
    <div class="escala">${ins.escala.map((e) => `<button class="opt ${resp[it.codigo] === e.valor ? 'sel' : ''}" data-v="${e.valor}"><span class="ico">${icon(e.valor)}</span><span class="lab">${esc(e.etiqueta)}</span><span class="sub">${esc(e.sub)}</span></button>`).join('')}</div>
`;
  $('#kBody').querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => { resp[it.codigo] = Number(b.dataset.v); guardarAvance(); renderKid(); }));
  $('#kNext').disabled = resp[it.codigo] == null;
  $('#kNext').textContent = i === seq.length - 1 ? 'Terminar' : 'Siguiente';
  $('#kBack').disabled = i === 0;
  $('#kNav').classList.remove('oculto');
}
function guardarAvance() { if (!K) return; localStorage.setItem('avance', JSON.stringify({ key: K.key, codigo: K.codigo, momento: K.momento, aplicador: K.aplicador, i: K.i, resp: K.resp, transcurrido: Date.now() - K.t0, fecha: new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) })); }
$('#kNext').addEventListener('click', () => { if (K.i < K.seq.length - 1) { K.i++; guardarAvance(); renderKid(); } else finKid(); });
$('#kBack').addEventListener('click', () => { if (K.i > 0) { K.i--; guardarAvance(); renderKid(); } });
$('#kExit').addEventListener('click', async () => {
  const empezada = K && Object.keys(K.resp).length > 0 && !$('#kBody').querySelector('.kid-fin');
  if (empezada && !(await dialogo({ titulo: 'Salir de la aplicación', texto: 'El avance queda guardado en este dispositivo y puede continuar después desde "Aplicar al estudiante".', ok: 'Salir', cancelar: 'Seguir aquí' }))) return;
  if (!empezada) localStorage.removeItem('avance');
  cerrarKid();
});
$('#kAyudaBtn').addEventListener('click', () => $('#kAyudaPanel').classList.toggle('oculto'));
document.addEventListener('click', (e) => { // el guion se cierra al pulsar fuera de él
  for (const [panel, btn] of [['#ayudaPanel', '#ayudaBtn'], ['#kAyudaPanel', '#kAyudaBtn']]) if (!e.target.closest(panel) && !e.target.closest(btn)) $(panel).classList.add('oculto');
});
document.addEventListener('keydown', (e) => {
  if (!K || e.target.tagName === 'TEXTAREA' || !$('#dialogo').classList.contains('oculto')) return;
  if (/^[1-5]$/.test(e.key)) { const b = $('#kBody').querySelector(`.opt[data-v="${e.key}"]`); if (b) b.click(); }
  else if (e.key === 'Enter' && !$('#kNext').disabled && !$('#kNav').classList.contains('oculto')) $('#kNext').click();
});
function cerrarKid(guardado) { K = null; $('#kid').classList.add('oculto'); $('#app').classList.remove('oculto'); if (guardado && origen === 'estudiantes') { origen = null; vista = 'estudiantes'; } recargar(); }
function finKid() {
  const { ins, codigo, momento, aplicador, resp } = K;
  const items = {}; ins.items.forEach((it) => (items[it.codigo] = resp[it.codigo]));
  const sc = puntajes(K.key, items), dur = Math.round((Date.now() - K.t0) / 1000);
  $('#kProg').style.width = '100%'; $('#kCount').textContent = 'Completo'; $('#kNav').classList.add('oculto');
  $('#kBody').innerHTML = `<div class="kid-fin"><p class="kid-stmt" style="font-size:34px">¡Muy bien, terminamos!</p>
    <p style="color:var(--tinta-2)">Resumen para el aplicador: ${esc(ins.corto)} (${esc(ins.nombre)}), ${esc(codigo)} ${esc(nombreDe(codigo))}, ${esc(momento)}, ${dur} s.</p>
    <table>${ins.puntajes.map((p) => `<tr><td>${esc(p.etiqueta)}</td><td>${sc[p.variable]}</td></tr>`).join('')}</table>
    <div class="campo"><label for="kObs">Observaciones (opcional)</label><textarea id="kObs" rows="2"></textarea></div>
    <div class="fila" style="margin-top:12px"><button class="btn grande" id="kSave">Guardar</button><button class="btn sec grande" id="kDiscard">Descartar</button></div><div id="kMsg" style="margin-top:10px"></div></div>`;
  $('#kSave').addEventListener('click', async () => {
    $('#kSave').disabled = true;
    const cuerpo = { store: STORE[K.key], row: { codigo, momento, aplicador, duracion_seg: dur, ...items, observaciones: $('#kObs').value.trim() } };
    try { await api('registro', { method: 'PUT', body: cuerpo }); localStorage.removeItem('avance'); toast('Guardado'); cerrarKid(true); }
    catch (e) {
      if (e.status && e.status < 500) { $('#kMsg').innerHTML = `<div class="aviso mal">No se pudo guardar: ${esc(e.message)}.</div>`; $('#kSave').disabled = false; return; }
      // sin conexión (o falla del servidor): queda en este dispositivo y se envía cuando vuelva la conexión
      encolar({ ...cuerpo, corto: ins.corto, fecha: new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) }); localStorage.removeItem('avance');
      toast('Sin conexión: la aplicación quedó guardada en este dispositivo y se enviará cuando vuelva la conexión'); cerrarKid(true);
    }
  });
  $('#kDiscard').addEventListener('click', async () => { if (await dialogo({ titulo: 'Descartar aplicación', texto: 'Se descartan las respuestas de esta aplicación sin guardarlas.', ok: 'Descartar', peligro: true })) { localStorage.removeItem('avance'); cerrarKid(); } });
}
/* ---------- cola de envío sin conexión ---------- */
const leerCola = () => { try { return JSON.parse(localStorage.getItem('colaEnvio') || '[]'); } catch { return []; } };
function encolar(x) { const c = leerCola(); c.push(x); localStorage.setItem('colaEnvio', JSON.stringify(c)); pintarCola(); }
function pintarCola() {
  const c = leerCola(), el = $('#pendientes');
  el.classList.toggle('oculto', !c.length);
  if (c.length) el.innerHTML = `<span><b>${c.length} aplicación${c.length > 1 ? 'es' : ''} pendiente${c.length > 1 ? 's' : ''} de enviar</b> (guardada${c.length > 1 ? 's' : ''} en este dispositivo): ${c.map((x) => `${esc(x.corto)} de ${esc(x.row.codigo)} ${esc(x.row.momento)}`).join('; ')}.</span><button class="btn chico" id="btnEnviarCola">Enviar ahora</button>`;
  $('#btnEnviarCola')?.addEventListener('click', () => enviarCola(true));
}
let enviando = false;
async function enviarCola(avisar = false) {
  if (enviando || !D) return; const c = leerCola(); if (!c.length) return; enviando = true;
  const quedan = []; let ok = 0;
  for (const x of c) { try { await api('registro', { method: 'PUT', body: { store: x.store, row: x.row } }); ok++; } catch (e) { if (e.status && e.status < 500) { toast(`No se aceptó ${x.corto} de ${x.row.codigo}: ${e.message}`, true); ok++; } else quedan.push(x); } }
  localStorage.setItem('colaEnvio', JSON.stringify(quedan)); enviando = false; pintarCola();
  if (ok) { toast(`${ok} aplicación${ok > 1 ? 'es' : ''} enviada${ok > 1 ? 's' : ''}`); await recargar(); } else if (avisar) toast('Todavía no hay conexión con el servidor', true);
}
window.addEventListener('online', () => enviarCola());
setInterval(() => { if (leerCola().length) enviarCola(); }, 60000);

/* ---------- acudientes ---------- */
let enlaces = [];
const urlF = (e) => `${location.origin}/familia.html?e=${e.codigo}&t=${e.t}`;
const msgF = (e) => `Hola. Le pedimos el favor de responder unas preguntas cortas sobre la lectura y la escritura de *${(e.nombre || e.codigo).replace(/[*_~]/g, '')}* en casa. Toma 5 minutos y se responde desde el celular: ${urlF(e)}\n¡Muchas gracias!`; // *nombre* = negrita en WhatsApp
async function verFamilias() {
  $('#tablaF').innerHTML = '<p class="guia">Cargando…</p>';
  try { await cargar(); enlaces = (await api('enlaces')).enlaces; } catch (e) { $('#tablaF').innerHTML = `<div class="aviso mal">${esc(e.message)}</div>`; return; }
  const resp = enlaces.filter((e) => reg('cff', e.codigo)).length;
  $('#resumenF').textContent = enlaces.length ? `${resp} de ${enlaces.length} respondidos` : '';
  const filaF = (e) => { const r = reg('cff', e.codigo); return `<tr><td><b>${esc(e.codigo)}</b></td><td>${esc(e.nombre)}</td><td>${r ? `<span class="estado si" style="cursor:default;pointer-events:none">Respondido ${esc(r.fecha)} · ${esc(r.informante)}</span>` : '<span class="estado">Pendiente</span>'}</td>
      <td><a class="btn wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msgF(e))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.6-1.2A9 9 0 1 0 12 3z"/></svg>Enviar por WhatsApp</a><button class="lnk chico" data-copy="${esc(urlF(e))}" title="Copiar el enlace para enviarlo por otro medio">Copiar enlace</button></td></tr>`; };
  const lista = enlaces.filter((e) => e.grupo === grupoActivo);
  $('#tablaF').innerHTML = tabsGrupo(enlaces, (l) => `${l.filter((e) => reg('cff', e.codigo)).length}/${l.length}`) + (lista.length ? `<table class="datos"><thead><tr><th>Código</th><th>Nombre</th><th>Estado</th><th>Enlace</th></tr></thead><tbody>` + lista.map(filaF).join('') + '</tbody></table>'
    : `<div class="aviso nota">No hay estudiantes en el grupo ${grupoActivo}.</div>`);
  activarTabs($('#tablaF'), verFamilias);
  $('#tablaF').querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => { await navigator.clipboard.writeText(b.dataset.copy); toast('Enlace copiado'); }));
}
/* ---------- tabla de respuestas (formato panel) ---------- */
let verR = 'todo';
seg('#rVer', (m) => { verR = m; verRespuestas(); });
function verRespuestas() {
  const todas = columnasRespuestas(), cols = todas.filter((c) => verR === 'todo' || c.tipo !== 'item');
  const ps = D.participantes, lista = ps.filter((p) => p.grupo === grupoActivo).sort((a, b) => a.codigo.localeCompare(b.codigo));
  const dims = todas.filter((c) => c.tipo === 'dim');
  const completo = (p) => dims.every((c) => MOMENTOS.every((m) => { const r = buscarReg(D, c.key, p.codigo, m); return r && r[c.campo] !== ''; }));
  $('#resumenR').textContent = ps.length ? `${ps.filter(completo).length} de ${ps.length} estudiantes con las cinco aplicaciones` : '';
  const cuenta = (l, key, m) => l.filter((p) => buscarReg(D, key, p.codigo, m)).length;
  const fila = (g) => { const l = ps.filter((p) => p.grupo === g); const celda = (key, m) => { const n = cuenta(l, key, m); return `<td class="${l.length && n === l.length ? 'ok' : n ? 'parcial' : ''}">${n}/${l.length}</td>`; }; return `<tr><td class="g-${g.toLowerCase()}"><span class="punto"></span>${g}</td><td>${l.length}</td>${celda('EQI', 'Pretest')}${celda('EQI', 'Postest')}${celda('ESMS', 'Pretest')}${celda('ESMS', 'Postest')}${celda('CFF')}</tr>`; };
  $('#avance').innerHTML = ps.length ? `<table class="avance"><thead><tr><th>Avance</th><th>Estudiantes</th><th>Emocional pre</th><th>Emocional post</th><th>Lectoescritura pre</th><th>Lectoescritura post</th><th>Familiar</th></tr></thead><tbody>${GRUPOS.map(fila).join('')}</tbody></table>` : '';
  const bloques = PRUEBAS.map((P) => ({ P, cols: cols.filter((c) => c.key === P.key) })).filter((b) => b.cols.length);
  const clase = (P) => 'p-' + P.pre.toLowerCase();
  const celdas = (b, p, m) => { const r = buscarReg(D, b.P.key, p.codigo, m); return r ? b.cols.map((c, i) => `<td class="num ${c.tipo !== 'item' ? 'dim' : ''} ${i === 0 ? 'ini' : ''}">${esc(r[c.campo] ?? '')}</td>`).join('') : `<td colspan="${b.cols.length}" class="vacio ini" ${b.P.panel ? '' : 'rowspan="2"'}><span>${b.P.panel ? 'Sin aplicar' : 'Pendiente'}</span></td>`; };
  const filaEst = (p) => `<tr class="pre"><td rowspan="2" class="fijo r-cod"><b>${esc(p.codigo)}</b></td><td rowspan="2" class="fijo r-nom"><a href="#" data-ficha="${esc(p.codigo)}">${esc(nom(p))}</a></td><td class="fijo r-mom mom">Pretest</td><td rowspan="2" class="izq">${esc(p.sexo === 'Femenino' ? 'F' : p.sexo === 'Masculino' ? 'M' : '')}</td><td rowspan="2" class="izq">${esc(p.edad)}</td>${bloques.map((b) => b.P.panel ? celdas(b, p, 'Pretest') : (buscarReg(D, 'CFF', p.codigo) ? b.cols.map((c, i) => `<td rowspan="2" class="num ${c.tipo !== 'item' ? 'dim' : ''} ${i === 0 ? 'ini' : ''}">${esc(buscarReg(D, 'CFF', p.codigo)[c.campo] ?? '')}</td>`).join('') : celdas(b, p))).join('')}</tr>
    <tr class="post"><td class="fijo r-mom mom">Postest</td>${bloques.filter((b) => b.P.panel).map((b) => celdas(b, p, 'Postest')).join('')}</tr>`;
  $('#tablaR').innerHTML = tabsGrupo(ps, (l) => l.length) + (lista.length ? `<div class="tabla-r"><table class="resp-ancha"><thead>
    <tr><th rowspan="2" class="fijo r-cod">Código</th><th rowspan="2" class="fijo r-nom">Nombre</th><th rowspan="2" class="fijo r-mom">Momento</th><th rowspan="2">Sexo</th><th rowspan="2">Edad</th>${bloques.map((b) => `<th colspan="${b.cols.length}" class="${clase(b.P)} ini r1"><span>${esc(b.P.nombre)}${b.P.panel ? '' : ' <small>una sola aplicación</small>'}</span></th>`).join('')}</tr>
    <tr>${bloques.map((b) => b.cols.map((c, i) => `<th class="r2 ${c.tipo !== 'item' ? 'dim' : ''} ${i === 0 ? 'ini' : ''}" title="${esc(c.texto)}">${esc(c.id)}</th>`).join('')).join('')}</tr>
    </thead><tbody>${lista.map(filaEst).join('')}</tbody></table></div>`
    : `<div class="aviso nota">No hay estudiantes en el grupo ${grupoActivo}.</div>`);
  const t = $('#tablaR table');
  if (t) { const w = ['.r-cod', '.r-nom', '.r-mom'].map((c) => t.querySelector('thead ' + c).offsetWidth); t.style.setProperty('--l2', w[0] + 'px'); t.style.setProperty('--l3', w[0] + w[1] + 'px'); t.style.setProperty('--fijo', w[0] + w[1] + w[2] + 'px'); }
  activarTabs($('#tablaR'), verRespuestas);
  $('#tablaR').querySelectorAll('[data-ficha]').forEach((a) => a.addEventListener('click', () => verEstudiante(a.dataset.ficha)));
}

/* ---------- Excel, CSV y copia de seguridad ---------- */
async function conXLSX() { if (!window.XLSX) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'assets/xlsx.full.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
$('#btnExcel').addEventListener('click', async () => {
  try { await conXLSX(); await cargar(); descargar(construirExcel(D, $('#rMeta').checked), `Respuestas_instrumentos_${hoy()}.xlsx`); }
  catch (e) { toast('No se pudo generar el Excel: ' + e.message, true); }
});
$('#btnCSV').addEventListener('click', async () => {
  try { await conXLSX(); await cargar(); descargar(construirCSV(D, $('#rMeta').checked), `Respuestas_instrumentos_${hoy()}.csv`, 'text/csv;charset=utf-8'); }
  catch (e) { toast('No se pudo generar el CSV: ' + e.message, true); }
});
$('#btnCopia').addEventListener('click', async () => {
  try { const c = await api('copia'); descargar(JSON.stringify(c, null, 1), `Copia_instrumentos_${c.fecha_hora.replace(/[: ]/g, '-')}.json`, 'application/json'); toast('Copia de seguridad descargada'); }
  catch (e) { toast('No se pudo descargar la copia: ' + e.message, true); }
});
$('#archivoCopia').addEventListener('change', async () => {
  const f = $('#archivoCopia').files[0]; $('#archivoCopia').value = ''; if (!f) return;
  let c; try { c = JSON.parse(await f.text()); if (!Array.isArray(c.participantes)) throw new Error('no es una copia de esta app'); } catch (e) { return toast('Archivo no válido: ' + e.message, true); }
  const n = c.participantes.length + (c.eqi || []).length + (c.esms || []).length + (c.cff || []).length;
  if (!(await dialogo({ titulo: 'Restaurar copia de seguridad', texto: `La copia del ${c.fecha_hora || '?'} trae ${c.participantes.length} estudiantes y ${n - c.participantes.length} aplicaciones. Se escriben sobre los datos actuales con el mismo código y momento; lo que no esté en la copia se conserva.`, ok: 'Restaurar', peligro: true, escribir: 'RESTAURAR' }))) return;
  try { const r = await api('copia', { method: 'POST', body: { copia: c } }); toast(`Copia restaurada: ${r.n} registros escritos`); await recargar(); } catch (e) { toast('No se pudo restaurar: ' + e.message, true); }
});

/* ---------- arranque ---------- */
(async () => {
  const c = sessionStorage.getItem('clave');
  if (c) { try { await entrar(c); return; } catch (e) {} }
  $('#clave').focus();
})();
