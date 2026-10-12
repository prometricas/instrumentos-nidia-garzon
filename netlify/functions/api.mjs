// API de la app de instrumentos. Datos en Netlify Blobs; acceso del aplicador con la clave APP_CLAVE
// (variable de entorno definida en Netlify); acceso de las familias con un enlace firmado por estudiante y momento.
import { getStore } from "@netlify/blobs";
import INS from "../lib/instrumentos.mjs";

const STORES = ["participantes", "eqi", "esms", "cff", "bitacora"];
const KEY = { eqi: "EQI", esms: "ESMS", cff: "CFF" };
const store = (name) => getStore({ name, consistency: "strong" });
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const z = (n) => String(n).padStart(2, "0");
function ahora() { // hora de Colombia (UTC-5)
  const d = new Date(Date.now() - 5 * 3600 * 1000);
  return `${d.getUTCFullYear()}-${z(d.getUTCMonth() + 1)}-${z(d.getUTCDate())} ${z(d.getUTCHours())}:${z(d.getUTCMinutes())}:${z(d.getUTCSeconds())}`;
}
const hoy = () => ahora().slice(0, 10);

async function firmar(clave, texto) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(clave), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(texto)));
  return [...sig].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const token = (clave, codigo, momento) => firmar(clave, `familia|${codigo}|${momento}`);

async function leerTodo(name) {
  const s = store(name);
  const { blobs } = await s.list();
  const rows = await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" })));
  return rows.filter(Boolean);
}
async function bitacora(evento, detalle) {
  await store("bitacora").setJSON(`${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, { fecha_hora: ahora(), evento, detalle });
}
function puntajes(key, resp) {
  const ins = INS[key], n = ins.escala.length, out = {};
  const rec = (it) => { const v = Number(resp[it.codigo]); return it.inverso ? n + 1 - v : v; };
  for (const p of ins.puntajes) {
    let its;
    if (p.dimension === "*") its = ins.items;
    else if (p.dimension.endsWith(".*")) its = ins.items.filter((i) => i.dimension.startsWith(p.dimension.slice(0, -2)));
    else its = ins.items.filter((i) => i.dimension === p.dimension);
    out[p.variable] = its.reduce((s, i) => s + rec(i), 0);
  }
  return out;
}
function validarItems(key, items) {
  const ins = INS[key], n = ins.escala.length;
  for (const it of ins.items) { const v = Number(items[it.codigo]); if (!Number.isInteger(v) || v < 1 || v > n) return `Respuesta inválida en ${it.codigo}`; }
  return null;
}
const MOMENTOS = ["Pretest", "Postest"];
const PRUEBA = [
  ["E01", "Débora Plata", "Experimental", "201", "Femenino", 7], ["E02", "Aquiles Estudio", "Experimental", "201", "Masculino", 8],
  ["E03", "Elsa Pato", "Experimental", "201", "Femenino", 8], ["E04", "Armando Paredes", "Experimental", "201", "Masculino", 7],
  ["E05", "Susana Oria", "Experimental", "201", "Femenino", 9], ["E06", "Esteban Dido", "Experimental", "201", "Masculino", 7],
  ["E07", "Elena Nito", "Control", "202", "Femenino", 7], ["E08", "Dolores Fuertes", "Control", "202", "Femenino", 8],
  ["E09", "Alan Brito", "Control", "202", "Masculino", 8], ["E10", "Aitor Tilla", "Control", "202", "Masculino", 7],
  ["E11", "Mario Neta", "Control", "202", "Masculino", 9], ["E12", "Lola Mento", "Control", "202", "Femenino", 7],
];

export default async (req) => {
  const url = new URL(req.url);
  const ruta = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
  const clave = Netlify.env.get("APP_CLAVE");
  if (!clave) return json({ error: "Falta definir la variable APP_CLAVE en Netlify" }, 500);
  const body = req.method === "GET" || req.method === "DELETE" ? {} : await req.json().catch(() => ({}));

  // ---- familias (enlace firmado, sin clave) ----
  if (ruta === "familia") {
    const e = String(url.searchParams.get("e") || body.e || "").toUpperCase(), m = url.searchParams.get("m") || body.m, t = url.searchParams.get("t") || body.t;
    if (!e || !MOMENTOS.includes(m) || !t || t !== (await token(clave, e, m))) return json({ error: "Enlace no válido" }, 403);
    const p = await store("participantes").get(e, { type: "json" });
    if (!p) return json({ error: "Estudiante no registrado" }, 404);
    const previo = await store("cff").get(`${e}|${m}`, { type: "json" });
    if (req.method === "GET") return json({ ok: true, codigo: e, nombre: p.nombre, momento: m, respondido: !!previo, fecha: previo?.fecha || null });
    if (req.method === "POST") {
      const err = validarItems("CFF", body.items || {});
      if (err) return json({ error: err }, 400);
      const items = {}; INS.CFF.items.forEach((it) => (items[it.codigo] = Number(body.items[it.codigo])));
      const row = { codigo: e, momento: m, fecha: hoy(), informante: ["Madre", "Padre", "Acudiente"].includes(body.informante) ? body.informante : "Acudiente", ...items, ...puntajes("CFF", items), observaciones: String(body.observaciones || "").slice(0, 500) };
      await store("cff").setJSON(`${e}|${m}`, row);
      await bitacora(previo ? "sobrescritura" : "aplicacion", `CFCSAL-F ${e} ${m} (familia por enlace)`);
      return json({ ok: true });
    }
    return json({ error: "Método no permitido" }, 405);
  }

  // ---- aplicador (clave) ----
  if (ruta === "entrar") return body.clave === clave ? json({ ok: true }) : json({ error: "Clave incorrecta" }, 401);
  if (req.headers.get("x-clave") !== clave) return json({ error: "Clave requerida" }, 401);

  if (ruta === "datos" && req.method === "GET") {
    const [participantes, eqi, esms, cff, bit] = await Promise.all(STORES.map(leerTodo));
    participantes.sort((a, b) => a.codigo.localeCompare(b.codigo));
    bit.sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora));
    return json({ participantes, eqi, esms, cff, bitacora: bit });
  }
  if (ruta === "participante" && req.method === "PUT") {
    const r = body.row || {};
    const codigo = String(r.codigo || "").trim().toUpperCase();
    if (!/^[A-Z0-9]{1,8}$/.test(codigo)) return json({ error: "Código inválido (letras y números, máximo 8)" }, 400);
    const row = { codigo, nombre: String(r.nombre || "").trim().slice(0, 80), grupo: r.grupo === "Control" ? "Control" : "Experimental", curso: String(r.curso || "").trim().slice(0, 10), sexo: r.sexo === "Masculino" ? "Masculino" : "Femenino", edad: Number(r.edad) || "", fecha_registro: r.fecha_registro || hoy(), observaciones: String(r.observaciones || "").slice(0, 300) };
    const existia = await store("participantes").get(codigo, { type: "json" });
    await store("participantes").setJSON(codigo, row);
    await bitacora(existia ? "edicion" : "registro", `Participante ${codigo} ${row.nombre} (${row.grupo})`);
    return json({ ok: true, row });
  }
  if (ruta === "participante" && req.method === "DELETE") {
    const codigo = String(url.searchParams.get("codigo") || "").toUpperCase();
    await store("participantes").delete(codigo);
    for (const s of ["eqi", "esms", "cff"]) for (const m of MOMENTOS) await store(s).delete(`${codigo}|${m}`);
    await bitacora("eliminacion", `Participante ${codigo} y sus registros`);
    return json({ ok: true });
  }
  if (ruta === "registro" && req.method === "PUT") {
    const s = body.store, key = KEY[s];
    if (!key) return json({ error: "Instrumento desconocido" }, 400);
    const r = body.row || {}, codigo = String(r.codigo || "").toUpperCase(), momento = r.momento;
    if (!MOMENTOS.includes(momento)) return json({ error: "Momento inválido" }, 400);
    if (!(await store("participantes").get(codigo, { type: "json" }))) return json({ error: "Estudiante no registrado" }, 404);
    const err = validarItems(key, r); if (err) return json({ error: err }, 400);
    const items = {}; INS[key].items.forEach((it) => (items[it.codigo] = Number(r[it.codigo])));
    const row = { codigo, momento, fecha: hoy(), ...(s === "cff" ? { informante: r.informante || "Acudiente" } : { aplicador: String(r.aplicador || "").slice(0, 80), duracion_seg: Number(r.duracion_seg) || 0 }), ...items, ...puntajes(key, items), observaciones: String(r.observaciones || "").slice(0, 500) };
    const previo = await store(s).get(`${codigo}|${momento}`, { type: "json" });
    await store(s).setJSON(`${codigo}|${momento}`, row);
    await bitacora(previo ? "sobrescritura" : "aplicacion", `${INS[key].nombre} ${codigo} ${momento}`);
    return json({ ok: true, row });
  }
  if (ruta === "registro" && req.method === "DELETE") {
    const s = url.searchParams.get("store"), codigo = String(url.searchParams.get("codigo") || "").toUpperCase(), momento = url.searchParams.get("momento");
    if (!KEY[s] || !MOMENTOS.includes(momento)) return json({ error: "Parámetros inválidos" }, 400);
    await store(s).delete(`${codigo}|${momento}`);
    await bitacora("eliminacion", `${INS[KEY[s]].nombre} ${codigo} ${momento}`);
    return json({ ok: true });
  }
  if (ruta === "enlaces" && req.method === "GET") {
    const m = url.searchParams.get("m");
    if (!MOMENTOS.includes(m)) return json({ error: "Momento inválido" }, 400);
    const participantes = await leerTodo("participantes");
    const out = await Promise.all(participantes.sort((a, b) => a.codigo.localeCompare(b.codigo)).map(async (p) => ({ codigo: p.codigo, nombre: p.nombre, t: await token(clave, p.codigo, m) })));
    return json({ momento: m, enlaces: out });
  }
  if (ruta === "prueba" && req.method === "POST") {
    const existentes = await leerTodo("participantes");
    if (existentes.length) return json({ error: "Ya hay estudiantes registrados" }, 400);
    for (const [codigo, nombre, grupo, curso, sexo, edad] of PRUEBA) await store("participantes").setJSON(codigo, { codigo, nombre, grupo, curso, sexo, edad, fecha_registro: hoy(), observaciones: "Registro ficticio de prueba" });
    await bitacora("registro", "12 estudiantes ficticios de prueba");
    return json({ ok: true });
  }
  return json({ error: "Ruta no encontrada" }, 404);
};

export const config = { path: "/api/*" };
