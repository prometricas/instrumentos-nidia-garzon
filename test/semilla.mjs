// Datos ficticios para revisar la app en local. No toca el sitio publicado.
// Uso: con el servidor local encendido (node dev-local.mjs), en otra ventana de Git Bash:  node test/semilla.mjs
//
// Qué hace, en este orden:
//   1. Separa nombre y apellido de los estudiantes que tengan todo escrito en "Nombre" (p. ej. "Elsa Pato").
//   2. Registra o ajusta el plantel ficticio de los tres grupos (ver PLAN).
//   3. Crea las aplicaciones que falten con respuestas aleatorias pero coherentes con el perfil de cada
//      estudiante (emocional alto/medio/bajo, lector alto/medio/bajo, familia que acompaña mucho/poco).
//      En el grupo Experimental el postest mejora un poco; en Control se mantiene.
// Nunca reemplaza una aplicación ya guardada ni borra nada. Algunas aplicaciones quedan pendientes a propósito.

//            código, nombre,    apellido,   grupo,          sexo,        edad, emocional, lector, familia,     aplicaciones (EmoPre EmoPost LecPre LecPost Fam)
const PLAN = [
  ['E11', 'Mario',   'Neta',     'Piloto',       'Masculino', 8, 'medio', 'alto',  'acompaña', 'EmoPre EmoPost LecPre LecPost Fam'],
  ['E12', 'Lola',    'Mento',    'Piloto',       'Femenino',  7, 'alto',  'medio', 'medio',    'EmoPre EmoPost LecPre Fam'],
  ['E13', 'Débora',  'Plata',    'Piloto',       'Femenino',  7, 'bajo',  'bajo',  'poco',     'EmoPre'],
  ['E02', 'Aquiles', 'Estudio',  'Experimental', 'Masculino', 8, 'alto',  'alto',  'acompaña', 'EmoPre LecPre'],
  ['E03', 'Elsa',    'Pato',     'Experimental', 'Femenino',  8, 'medio', 'medio', 'medio',    'EmoPre EmoPost LecPre LecPost Fam'],
  ['E04', 'Armando', 'Paredes',  'Experimental', 'Masculino', 7, 'bajo',  'medio', 'poco',     'EmoPre EmoPost LecPre LecPost Fam'],
  ['E05', 'Susana',  'Oria',     'Experimental', 'Femenino',  9, 'alto',  'bajo',  'acompaña', 'EmoPre EmoPost LecPre Fam'],
  ['E07', 'Elena',   'Nito',     'Control',      'Femenino',  7, 'medio', 'alto',  'acompaña', 'EmoPre EmoPost LecPre LecPost Fam'],
  ['E08', 'Dolores', 'Fuertes',  'Control',      'Femenino',  8, 'bajo',  'bajo',  'poco',     'EmoPre EmoPost LecPre LecPost'],
  ['E09', 'Alan',    'Brito',    'Control',      'Masculino', 8, 'alto',  'medio', 'medio',    'EmoPre LecPre Fam'],
  ['E10', 'Aitor',   'Tilla',    'Control',      'Masculino', 9, 'medio', 'bajo',  'acompaña', 'EmoPre EmoPost LecPre Fam'],
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

async function semilla({ base = '', clave, INS, log = console.log }) {
  const api = async (ruta, opciones = {}) => {
    const r = await fetch(base + '/api/' + ruta, { ...opciones, headers: { 'content-type': 'application/json', 'x-clave': clave }, body: opciones.body ? JSON.stringify(opciones.body) : undefined });
    const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Error ' + r.status); return d;
  };
  const D = await api('datos');
  const porCodigo = Object.fromEntries(D.participantes.map((p) => [p.codigo, p]));
  const plan = Object.fromEntries(PLAN.map((f) => [f[0], f]));
  // 1 y 2: nombres, apellidos y plantel
  for (const p of D.participantes) {
    const f = plan[p.codigo]; let row;
    if (f) row = { ...p, nombre: f[1], apellido: f[2], grupo: f[3], sexo: f[4], edad: f[5] };
    else if (!p.apellido && p.nombre.trim().split(/\s+/).length > 1) { const w = p.nombre.trim().split(/\s+/); row = { ...p, nombre: w[0], apellido: w.slice(1).join(' ') }; }
    if (row && JSON.stringify(row) !== JSON.stringify(p)) { await api('participante', { method: 'PUT', body: { row } }); log(`ajustado ${row.codigo} ${row.nombre} ${row.apellido} (${row.grupo})`); }
  }
  const omitidos = new Set();
  for (const f of PLAN) if (!porCodigo[f[0]]) {
    try { await api('participante', { method: 'PUT', body: { row: { codigo: f[0], nombre: f[1], apellido: f[2], grupo: f[3], sexo: f[4], edad: f[5] }, nuevo: true } }); log(`registrado ${f[0]} ${f[1]} ${f[2]} (${f[3]})`); }
    catch (e) { omitidos.add(f[0]); log(`omitido ${f[0]}: ${e.message}`); } // p. ej. el código está en la papelera
  }
  // 3: aplicaciones que falten
  const hay = (s, c, m) => D[s].some((r) => r.codigo === c && (s === 'cff' || r.momento === m));
  const tokens = Object.fromEntries((await api('enlaces')).enlaces.map((e) => [e.codigo, e.t]));
  let n = 0;
  for (const [codigo, , , grupo, , , emo, lec, fam, apl] of PLAN) {
    if (omitidos.has(codigo)) continue;
    for (const [tag, key, s, nivel] of [['Emo', 'EQI', 'eqi', emo], ['Lec', 'ESMS', 'esms', lec]]) {
      for (const m of ['Pretest', 'Postest']) {
        if (!apl.includes(tag + (m === 'Pretest' ? 'Pre' : 'Post')) || hay(s, codigo, m)) continue;
        const ajuste = m === 'Postest' ? (grupo === 'Experimental' ? 0.15 : (Math.random() - 0.5) * 0.06) : 0;
        await api('registro', { method: 'PUT', body: { store: s, row: { codigo, momento: m, aplicador: 'Nidia Garzón', duracion_seg: 240 + Math.floor(Math.random() * 200), ...respuestas(INS[key], nivel, ajuste), observaciones: '' } } });
        n++; log(`${codigo} ${INS[key].corto} ${m}`);
      }
    }
    if (apl.includes('Fam') && !hay('cff', codigo)) {
      await api('familia', { method: 'POST', body: { e: codigo, t: tokens[codigo], informante: INFORMANTES[Math.floor(Math.random() * INFORMANTES.length)], items: respuestas(INS.CFF, fam, 0), observaciones: '' } });
      n++; log(`${codigo} ${INS.CFF.corto} (acudiente)`);
    }
  }
  log(`Listo: ${n} aplicaciones nuevas.`);
}

if (typeof process !== 'undefined' && process.versions?.node) { // desde Node: node test/semilla.mjs
  const fs = await import('node:fs');
  const env = {}; if (fs.existsSync('.env')) for (const l of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/); if (m) env[m[1]] = m[2]; }
  const INS = (await import('../netlify/lib/instrumentos.mjs')).default;
  await semilla({ base: process.env.BASE || 'http://localhost:8888', clave: env.APP_CLAVE || 'nidia.2026', INS });
}
