// Código compartido por la app del aplicador y la página de familias.
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const z = (n) => String(n).padStart(2, '0');
const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; };
function toast(t, mal) { const e = $('#toast'); e.textContent = t; e.classList.toggle('mal', !!mal); e.classList.add('ver'); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove('ver'), 3200); }

async function api(ruta, opciones = {}) {
  const r = await fetch('/api/' + ruta, { ...opciones, headers: { 'content-type': 'application/json', ...(sessionStorage.getItem('clave') ? { 'x-clave': sessionStorage.getItem('clave') } : {}), ...(opciones.headers || {}) }, body: opciones.body ? JSON.stringify(opciones.body) : undefined });
  const d = await r.json().catch(() => ({ error: 'Respuesta inválida del servidor' }));
  if (!r.ok) { const e = new Error(d.error || ('Error ' + r.status)); e.status = r.status; throw e; }
  return d;
}

function puntajes(key, resp) {
  const ins = INS[key], n = ins.escala.length, out = {};
  const rec = (it) => { const v = Number(resp[it.codigo]); return it.inverso ? n + 1 - v : v; };
  for (const p of ins.puntajes) {
    let its;
    if (p.dimension === '*') its = ins.items;
    else if (p.dimension.endsWith('.*')) its = ins.items.filter((i) => i.dimension.startsWith(p.dimension.slice(0, -2)));
    else its = ins.items.filter((i) => i.dimension === p.dimension);
    out[p.variable] = its.reduce((s, i) => s + rec(i), 0);
  }
  return out;
}

// EQ-i: caritas de certeza ("¿qué tan cierto es esto para ti?")
function iconSure(v) {
  const c = 52, k = '#1C2433', sh = '#7A8AB3';
  const r = [34, 38, 42, 46][v - 1];
  const fill = ['#DCE3F5', '#B9C8EE', '#8FA8E3', '#5B7ED0'][v - 1];
  const edge = ['#A9B7DB', '#8AA0DA', '#5F7FCF', '#00368C'][v - 1];
  const dx = Math.round(r * 0.36), ey = c - Math.round(r * 0.12), er = Math.max(4, Math.round(r * 0.11));
  let eyes = '', brows = '', mouth = '', extra = '', tilt = '';
  if (v === 1) {
    eyes = `<circle cx="${c - dx - 3}" cy="${ey}" r="${er}" fill="${k}"/><circle cx="${c + dx - 3}" cy="${ey}" r="${er}" fill="${k}"/>`;
    brows = `<path d="M${c - dx - 8} ${ey - 10} q6 -6 13 -3 M${c + dx + 8} ${ey - 10} q-6 -6 -13 -3" stroke="${k}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    mouth = `<path d="M${c - 10} ${c + 17} q10 -8 20 0" stroke="${k}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    extra = `<path d="M${c - r - 9} ${c - 13} q-6 13 0 26 M${c - r - 16} ${c - 8} q-4 8 0 16 M${c + r + 9} ${c - 13} q6 13 0 26 M${c + r + 16} ${c - 8} q4 8 0 16" stroke="${sh}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  } else if (v === 2) {
    eyes = `<circle cx="${c - dx}" cy="${ey}" r="${er}" fill="${k}"/><circle cx="${c + dx}" cy="${ey}" r="${er}" fill="${k}"/>`;
    brows = `<path d="M${c - dx - 8} ${ey - 11} l16 -1 M${c + dx - 8} ${ey - 17} q8 -5 16 -1" stroke="${k}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    mouth = `<path d="M${c - 10} ${c + 16} l20 -1" stroke="${k}" stroke-width="5" stroke-linecap="round"/>`;
  } else if (v === 3) {
    eyes = `<circle cx="${c - dx}" cy="${ey}" r="${er}" fill="${k}"/><circle cx="${c + dx}" cy="${ey}" r="${er}" fill="${k}"/>`;
    mouth = `<path d="M${c - 13} ${c + 12} q13 13 26 0" stroke="${k}" stroke-width="5.5" fill="none" stroke-linecap="round"/>`;
  } else {
    tilt = ` transform="rotate(-7 ${c} ${c})"`;
    eyes = `<path d="M${c - dx - 7} ${ey + 2} q7 -9 14 0 M${c + dx - 7} ${ey + 2} q7 -9 14 0" stroke="${k}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    mouth = `<path d="M${c - 18} ${c + 8} q18 26 36 0 z" fill="${k}"/><path d="M${c - 11} ${c + 12} q11 9 22 0 q-11 7 -22 0 z" fill="#fff"/>`;
    extra = `<circle cx="${c - dx - 7}" cy="${c + 11}" r="6" fill="#F08A8A" opacity=".55"/><circle cx="${c + dx + 7}" cy="${c + 11}" r="6" fill="#F08A8A" opacity=".55"/>`;
  }
  return `<svg width="104" height="104" viewBox="0 0 104 104" aria-hidden="true"><g${tilt}><circle cx="${c}" cy="${c}" r="${r}" fill="${fill}" stroke="${edge}" stroke-width="4"/><ellipse cx="${(c - r * 0.3).toFixed(1)}" cy="${(c - r * 0.45).toFixed(1)}" rx="${(r * 0.26).toFixed(1)}" ry="${(r * 0.14).toFixed(1)}" fill="#fff" opacity=".5"/>${brows}${eyes}${mouth}${extra}</g></svg>`;
}
// ESMS-E: caritas de emoción ("¿cuánto se parece a ti?")
function iconFace(v) {
  const fill = ['#E8463C', '#F58B2B', '#F5C21B', '#8BC63F', '#2EB55D'][v - 1];
  const dark = ['#B32A22', '#C2651A', '#C29A0E', '#5F9A22', '#1F8A45'][v - 1];
  const eyes = v === 5 ? '<path d="M28 44 q8 -9 16 0 M60 44 q8 -9 16 0" stroke="#1E1A14" stroke-width="5.5" fill="none" stroke-linecap="round"/>'
    : v === 1 ? '<circle cx="36" cy="44" r="5.5" fill="#1E1A14"/><circle cx="68" cy="44" r="5.5" fill="#1E1A14"/><path d="M26 32 l18 7 M78 32 l-18 7" stroke="#1E1A14" stroke-width="5" stroke-linecap="round"/>'
    : v === 2 ? '<circle cx="36" cy="44" r="5.5" fill="#1E1A14"/><circle cx="68" cy="44" r="5.5" fill="#1E1A14"/><path d="M27 33 l16 4 M77 33 l-16 4" stroke="#1E1A14" stroke-width="5" stroke-linecap="round"/>'
    : '<circle cx="36" cy="44" r="5.5" fill="#1E1A14"/><circle cx="68" cy="44" r="5.5" fill="#1E1A14"/>';
  const mouth = ['<path d="M32 76 Q52 56 72 76" stroke="#1E1A14" stroke-width="6" fill="none" stroke-linecap="round"/>',
    '<path d="M34 72 Q52 64 70 72" stroke="#1E1A14" stroke-width="6" fill="none" stroke-linecap="round"/>',
    '<path d="M34 70 L70 70" stroke="#1E1A14" stroke-width="6" fill="none" stroke-linecap="round"/>',
    '<path d="M32 64 Q52 80 72 64" stroke="#1E1A14" stroke-width="6" fill="none" stroke-linecap="round"/>',
    '<path d="M28 60 Q52 90 76 60 Z" fill="#1E1A14"/><path d="M38 72 Q52 80 66 72 Q52 86 38 72 Z" fill="#fff"/>'][v - 1];
  return `<svg width="104" height="104" viewBox="0 0 104 104" aria-hidden="true"><circle cx="52" cy="52" r="46" fill="${fill}" stroke="${dark}" stroke-width="4"/><ellipse cx="38" cy="30" rx="12" ry="7" fill="#fff" opacity=".35"/>${eyes}${mouth}</svg>`;
}

// Libro de Excel con la misma estructura de la base local: una hoja por instrumento, bitácora y diccionario.
const META = { EQI: ['codigo', 'momento', 'fecha', 'aplicador', 'duracion_seg'], ESMS: ['codigo', 'momento', 'fecha', 'aplicador', 'duracion_seg'], CFF: ['codigo', 'momento', 'fecha', 'informante'] };
const META_LABEL = { codigo: ['Código del estudiante', 'texto', 'Debe existir en Participantes'], momento: ['Momento de medición', 'texto', 'Pretest | Postest'], fecha: ['Fecha de aplicación', 'fecha AAAA-MM-DD', ''], aplicador: ['Persona que aplicó el instrumento', 'texto', ''], informante: ['Parentesco del informante', 'texto', 'Madre | Padre | Acudiente'], duracion_seg: ['Duración de la aplicación en segundos', 'entero', '>= 0'] };
function construirExcel(datos) {
  const wb = XLSX.utils.book_new();
  const hoja = (nombre, headers, rows, anchos) => {
    const ws = XLSX.utils.aoa_to_sheet([headers].concat(rows.map((r) => headers.map((c) => r[c] ?? ''))));
    ws['!cols'] = headers.map((c) => ({ wch: anchos?.[c] || (c === 'observaciones' || c === 'detalle' ? 40 : c === 'nombre' || c === 'apellido' || c === 'etiqueta' ? 20 : c.length <= 5 ? 7 : Math.max(10, Math.min(18, c.length + 2))) }));
    XLSX.utils.book_append_sheet(wb, ws, nombre);
  };
  const dic = [];
  const ph = ['codigo', 'nombre', 'apellido', 'grupo', 'curso', 'sexo', 'edad', 'fecha_registro', 'observaciones'];
  hoja('Participantes', ph, datos.participantes);
  dic.push(['Participantes', 'codigo', 'Código del estudiante', 'texto', 'único, p. ej. E01', 'Clave de vinculación entre hojas'], ['Participantes', 'nombre', 'Nombre del estudiante', 'texto', '', 'Solo para identificarlo en la aplicación; no se usa en los análisis'], ['Participantes', 'apellido', 'Apellido del estudiante', 'texto', '', ''],
    ['Participantes', 'grupo', 'Condición del diseño cuasiexperimental', 'texto', 'Experimental | Control', ''], ['Participantes', 'curso', 'Curso o sección', 'texto', '', ''], ['Participantes', 'sexo', 'Sexo', 'texto', 'Femenino | Masculino', ''],
    ['Participantes', 'edad', 'Edad en años cumplidos', 'entero', '7 a 9', ''], ['Participantes', 'fecha_registro', 'Fecha de registro', 'fecha AAAA-MM-DD', '', ''], ['Participantes', 'observaciones', 'Notas', 'texto', '', '']);
  for (const [key, lista] of [['EQI', datos.eqi], ['ESMS', datos.esms], ['CFF', datos.cff]]) {
    const ins = INS[key], headers = META[key].concat(ins.items.map((i) => i.codigo), ins.puntajes.map((p) => p.variable), ['observaciones']);
    hoja(ins.hoja, headers, [...lista].sort((a, b) => (a.codigo + a.momento).localeCompare(b.codigo + b.momento)));
    const vals = ins.escala.map((e) => `${e.valor} = ${e.etiqueta}`).join(' | ');
    for (const m of META[key]) dic.push([ins.hoja, m, ...META_LABEL[m], '']);
    for (const it of ins.items) dic.push([ins.hoja, it.codigo, `${it.dimension}: ${it.texto}`, 'entero', vals, it.inverso ? `Reactivo inverso: se recodifica (${ins.escala.length} + 1 - x) antes de sumar` : 'Respuesta bruta']);
    for (const p of ins.puntajes) dic.push([ins.hoja, p.variable, p.etiqueta, 'entero', '', 'Suma de reactivos de la dimensión, con inversos recodificados']);
    dic.push([ins.hoja, 'observaciones', 'Notas de la aplicación', 'texto', '', '']);
  }
  hoja('Bitacora', ['fecha_hora', 'evento', 'detalle'], datos.bitacora);
  const wd = XLSX.utils.aoa_to_sheet([['hoja', 'variable', 'etiqueta', 'tipo', 'valores_validos', 'regla']].concat(dic));
  wd['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 70 }, { wch: 16 }, { wch: 48 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wd, 'Diccionario');
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}
function descargar(data, nombre) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); a.download = nombre; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
