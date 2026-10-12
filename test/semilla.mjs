// Datos ficticios para revisar la app en local. No toca el sitio publicado.
// Uso, con el servidor local encendido (node dev-local.mjs), en otra ventana de Git Bash:
//   node test/semilla.mjs              completa lo que falte sin reemplazar nada guardado
//   node test/semilla.mjs --reiniciar  borra todos los estudiantes (y la papelera) y vuelve a crear el plantel desde E01
//
// El consentimiento informado lo acepta el acudiente al responder su enlace y condiciona solo ese cuestionario;
// las aplicaciones al estudiante se guardan con o sin él. "Fam" = el acudiente respondió (y aceptó); sin "Fam"
// el estudiante queda con el cuestionario familiar pendiente.
// Las respuestas son aleatorias pero coherentes con el perfil de cada estudiante (emocional alto/medio/bajo,
// lector alto/medio/bajo, familia que acompaña mucho/poco); en Experimental el postest mejora un poco.

//            código, nombre,     apellido,            grupo,          sexo,        edad, emocional, lector, familia,  aplicaciones (Fam = el acudiente responde y acepta; EmoPre EmoPost LecPre LecPost), observaciones
const PLAN = [
  ['E01', 'Solomeo',   'Paredes',           'Piloto',       'Masculino', 8, 'medio', 'alto',  'acompaña', 'Fam EmoPre EmoPost LecPre LecPost'],
  ['E02', 'Alan',      'Brito Delgado',     'Piloto',       'Masculino', 8, 'alto',  'medio', 'medio',    'Fam EmoPre LecPre'],
  ['E03', 'Aquiles',   'Esquivel Madrazo',  'Piloto',       'Masculino', 8, 'alto',  'alto',  'acompaña', 'EmoPre LecPre'],
  ['E04', 'Joe',       'Hurtado Plata',     'Piloto',       'Masculino', 9, 'bajo',  'medio', 'poco',     'Fam EmoPre EmoPost LecPre LecPost', 'Medio hermano de Débora Plata (E05)'],
  ['E05', 'Débora',    'Plata',             'Piloto',       'Femenino',  7, 'bajo',  'bajo',  'poco',     'EmoPre', 'Media hermana de Joe Hurtado Plata (E04)'],
  ['E06', 'Elsa',      'Pato Roto',         'Experimental', 'Femenino',  8, 'medio', 'medio', 'medio',    'Fam EmoPre EmoPost LecPre LecPost'],
  ['E07', 'Armando',   'Casas de Bareque',  'Experimental', 'Masculino', 7, 'bajo',  'medio', 'poco',     'Fam EmoPre EmoPost LecPre LecPost'],
  ['E08', 'Ana',       'Tomía Forense',     'Experimental', 'Femenino',  9, 'alto',  'bajo',  'acompaña', 'Fam EmoPre EmoPost LecPre'],
  ['E09', 'Lola',      'Mento',             'Experimental', 'Femenino',  7, 'alto',  'medio', 'medio',    'EmoPre EmoPost LecPre'],
  ['E10', 'Elena',     'Nito del Bosque',   'Control',      'Femenino',  7, 'medio', 'alto',  'acompaña', 'Fam EmoPre EmoPost LecPre LecPost'],
  ['E11', 'Dolores',   'Fuertes de Barriga','Control',      'Femenino',  8, 'bajo',  'bajo',  'poco',     'EmoPre EmoPost LecPre LecPost'],
  ['E12', 'Esperanza', 'Perdida',           'Control',      'Femenino',  8, 'bajo',  'bajo',  'poco',     'Fam EmoPre LecPre'],
  ['E13', 'Esteban',   'Dido Prieto',       'Control',      'Masculino', 8, 'medio', 'medio', 'medio',    'EmoPre EmoPost LecPre LecPost'],
];
const NIVEL = { alto: 0.82, medio: 0.5, bajo: 0.22, acompaña: 0.82, poco: 0.22 }; // posición típica en la escala (0 = mínimo, 1 = máximo)
const INFORMANTES = ['Madre', 'Madre', 'Madre', 'Padre', 'Acudiente'];

function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function respuestas(ins, nivel, ajuste) {
  const n = ins.escala.length, out = {};
  for (const it of ins.items) {
    // motivación controlada (leer por premios o por complacer): no sube con la habilidad lectora
    let pos = ins.id === 'ESMS' && it.dimension.includes('controlada') ? { alto: 0.35, medio: 0.5, bajo: 0.6 }[nivel] : NIVEL[nivel];
    pos = Math.min(1, Math.max(0, pos + ajuste + gauss() * 0.17));
    let v = Math.min(n, Math.max(1, Math.round(1 + (n - 1) * pos)));
    out[it.codigo] = it.inverso ? n + 1 - v : v;
  }
  return out;
}

async function semilla({ base = '', clave, INS, log = console.log, reiniciar = false }) {
  const api = async (ruta, opciones = {}) => {
    const r = await fetch(base + '/api/' + ruta, { ...opciones, headers: { 'content-type': 'application/json', 'x-clave': clave }, body: opciones.body ? JSON.stringify(opciones.body) : undefined });
    const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Error ' + r.status); return d;
  };
  if (reiniciar) { // todo a la papelera y la papelera vacía
    const D0 = await api('datos');
    for (const p of D0.participantes) await api(`participante?codigo=${p.codigo}`, { method: 'DELETE' });
    for (const x of (await api('papelera')).papelera) await api(`papelera?codigo=${x.codigo}`, { method: 'DELETE' });
    log(`reinicio: ${D0.participantes.length} estudiantes borrados`);
  }
  const D = await api('datos');
  const porCodigo = Object.fromEntries(D.participantes.map((p) => [p.codigo, p]));
  const plan = Object.fromEntries(PLAN.map((f) => [f[0], f]));
  // 1 y 2: nombres, apellidos y plantel
  for (const p of D.participantes) {
    const f = plan[p.codigo]; let row;
    if (f) row = { ...p, nombre: f[1], apellido: f[2], grupo: f[3], sexo: f[4], edad: f[5], observaciones: f[10] || '' };
    else if (!p.apellido && p.nombre.trim().split(/\s+/).length > 1) { const w = p.nombre.trim().split(/\s+/); row = { ...p, nombre: w[0], apellido: w.slice(1).join(' ') }; }
    if (row && JSON.stringify(row) !== JSON.stringify(p)) { await api('participante', { method: 'PUT', body: { row } }); log(`ajustado ${row.codigo} ${row.nombre} ${row.apellido} (${row.grupo})`); }
  }
  const omitidos = new Set();
  for (const f of PLAN) if (!porCodigo[f[0]]) {
    try { await api('participante', { method: 'PUT', body: { row: { codigo: f[0], nombre: f[1], apellido: f[2], grupo: f[3], sexo: f[4], edad: f[5], observaciones: f[10] || '' }, nuevo: true } }); log(`registrado ${f[0]} ${f[1]} ${f[2]} (${f[3]})`); }
    catch (e) { omitidos.add(f[0]); log(`omitido ${f[0]}: ${e.message}`); } // p. ej. el código está en la papelera
  }
  // 3: el acudiente (si responde) y las aplicaciones que falten
  const hay = (s, c, m) => D[s].some((r) => r.codigo === c && (s === 'cff' || r.momento === m));
  const tokens = Object.fromEntries((await api('enlaces')).enlaces.map((e) => [e.codigo, e.t]));
  let n = 0;
  for (const [codigo, , , grupo, , , emo, lec, fam, apl] of PLAN) {
    if (omitidos.has(codigo)) continue;
    const conFam = apl.includes('Fam');
    if (conFam && !hay('cff', codigo)) {
      await api('familia', { method: 'POST', body: { e: codigo, t: tokens[codigo], acepta: true, informante: INFORMANTES[Math.floor(Math.random() * INFORMANTES.length)], items: respuestas(INS.CFF, fam, 0), observaciones: '' } });
      n++; log(`${codigo} ${INS.CFF.corto} (acudiente, acepta el consentimiento)`);
    }
    for (const [tag, key, s, nivel] of [['Emo', 'EQI', 'eqi', emo], ['Lec', 'ESMS', 'esms', lec]]) {
      for (const m of ['Pretest', 'Postest']) {
        if (!apl.includes(tag + (m === 'Pretest' ? 'Pre' : 'Post')) || hay(s, codigo, m)) continue;
        const ajuste = m === 'Postest' ? (grupo === 'Experimental' ? 0.15 : (Math.random() - 0.5) * 0.06) : 0;
        await api('registro', { method: 'PUT', body: { store: s, row: { codigo, momento: m, aplicador: 'Nidia Garzón', duracion_seg: 240 + Math.floor(Math.random() * 200), ...respuestas(INS[key], nivel, ajuste), observaciones: '' } } });
        n++; log(`${codigo} ${INS[key].corto} ${m}`);
      }
    }
  }
  log(`Listo: ${n} aplicaciones nuevas.`);
}

if (typeof process !== 'undefined' && process.versions?.node) { // desde Node: node test/semilla.mjs
  const fs = await import('node:fs');
  const env = {}; if (fs.existsSync('.env')) for (const l of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/); if (m) env[m[1]] = m[2]; }
  const INS = (await import('../netlify/lib/instrumentos.mjs')).default;
  if (!env.APP_CLAVE) { console.error('Falta el archivo .env con la línea APP_CLAVE=su_clave'); process.exit(1); }
  await semilla({ base: process.env.BASE || 'http://localhost:8888', clave: env.APP_CLAVE, INS, reiniciar: process.argv.includes('--reiniciar') });
}
