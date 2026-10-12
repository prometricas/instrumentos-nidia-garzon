// API de la app de instrumentos. Datos en Netlify Blobs; acceso del aplicador con la clave APP_CLAVE
// (variable de entorno definida en Netlify); acceso de las familias con un enlace firmado por estudiante y momento.
import { getStore } from "@netlify/blobs";
import INS from "../lib/instrumentos.mjs";

const STORES = ["participantes", "eqi", "esms", "cff", "bitacora"];
const REGS = ["eqi", "esms", "cff"];
const nomDe = (p) => [p.nombre, p.apellido].filter(Boolean).join(" ").trim();
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
const token = (clave, codigo) => firmar(clave, `familia|${codigo}`);
const GRUPOS = ["Piloto", "Experimental", "Control"];

async function leerTodo(name) {
  const s = store(name);
  const { blobs } = await s.list();
  // En Windows el almacén local entrega las claves codificadas (E03%7CPretest); se prueba también la clave decodificada.
  const rows = await Promise.all(blobs.map(async (b) => (await s.get(b.key, { type: "json" })) ?? (b.key.includes("%") ? await s.get(decodeURIComponent(b.key), { type: "json" }) : null)));
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
// Clave de cada aplicación: "E03-Pretest" (solo letras, números y guion, válida en cualquier sistema).
// Las versiones anteriores usaban "E03|Pretest"; se siguen leyendo y borrando para no dejar registros huérfanos.
const llave = (codigo, m) => `${codigo}-${m}`;
const antigua = (codigo, m) => `${codigo}|${m}`;
const llaves = (s, codigo) => (s === "cff" ? [codigo] : MOMENTOS.flatMap((m) => [llave(codigo, m), antigua(codigo, m)]));

export default async (req) => {
  const url = new URL(req.url);
  const ruta = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
  const clave = Netlify.env.get("APP_CLAVE");
  if (!clave) return json({ error: "Falta definir la variable APP_CLAVE en Netlify" }, 500);
  const body = req.method === "GET" || req.method === "DELETE" ? {} : await req.json().catch(() => ({}));

  // ---- familias (enlace firmado, sin clave) ----
  if (ruta === "familia") {
    const e = String(url.searchParams.get("e") || body.e || "").toUpperCase(), t = url.searchParams.get("t") || body.t;
    if (!e || !t || t !== (await token(clave, e))) return json({ error: "Enlace no válido" }, 403);
    const p = await store("participantes").get(e, { type: "json" });
    if (!p) return json({ error: "Estudiante no registrado" }, 404);
    const previo = await store("cff").get(e, { type: "json" });
    if (req.method === "GET") return json({ ok: true, codigo: e, nombre: nomDe(p), respondido: !!previo, fecha: previo?.fecha || null, informante: previo?.informante || null });
    if (req.method === "POST") {
      const err = validarItems("CFF", body.items || {});
      if (err) return json({ error: err }, 400);
      const items = {}; INS.CFF.items.forEach((it) => (items[it.codigo] = Number(body.items[it.codigo])));
      const row = { codigo: e, fecha: hoy(), informante: ["Madre", "Padre", "Acudiente"].includes(body.informante) ? body.informante : "Acudiente", ...items, ...puntajes("CFF", items), observaciones: String(body.observaciones || "").slice(0, 500) };
      await store("cff").setJSON(e, row);
      await bitacora(previo ? "sobrescritura" : "aplicacion", `CFCSAL-F ${e} (acudiente por enlace)`);
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
    if (!GRUPOS.includes(r.grupo)) return json({ error: "Seleccione el grupo" }, 400);
    if (!["Femenino", "Masculino"].includes(r.sexo)) return json({ error: "Seleccione el sexo" }, 400);
    const row = { codigo, nombre: String(r.nombre || "").trim().slice(0, 60), apellido: String(r.apellido || "").trim().slice(0, 60), grupo: r.grupo, sexo: r.sexo, edad: Number(r.edad) || "", fecha_registro: r.fecha_registro || hoy(), observaciones: String(r.observaciones || "").slice(0, 300) };
    const existia = await store("participantes").get(codigo, { type: "json" });
    if (body.nuevo) { // el código identifica al estudiante en todas las pruebas: nunca se reutiliza
      if (existia) return json({ error: `Ya existe un estudiante con el código ${codigo}` }, 409);
      if (await store("papelera").get(codigo, { type: "json" })) return json({ error: `El código ${codigo} pertenece a un estudiante de la papelera; recupérelo o use otro código` }, 409);
    }
    await store("participantes").setJSON(codigo, row);
    await bitacora(existia ? "edicion" : "registro", `Participante ${codigo} ${row.nombre} ${row.apellido} (${row.grupo})`);
    return json({ ok: true, row });
  }
  if (ruta === "participante" && req.method === "DELETE") { // a la papelera, con todos sus registros
    const codigo = String(url.searchParams.get("codigo") || "").toUpperCase();
    const p = await store("participantes").get(codigo, { type: "json" });
    if (!p) return json({ error: "Estudiante no encontrado" }, 404);
    const registros = {};
    for (const s of REGS) { registros[s] = []; for (const k of llaves(s, codigo)) { const r = await store(s).get(k, { type: "json" }); if (r) registros[s].push(r); } }
    await store("papelera").setJSON(codigo, { participante: p, registros, fecha: ahora() });
    for (const s of REGS) for (const k of llaves(s, codigo)) await store(s).delete(k);
    await store("participantes").delete(codigo);
    const n = REGS.reduce((a, s) => a + registros[s].length, 0);
    await bitacora("papelera", `Participante ${codigo} ${p.nombre} ${p.apellido || ""} movido a la papelera con ${n} registro(s)`);
    return json({ ok: true, registros: n });
  }
  if (ruta === "papelera" && req.method === "GET") {
    const lista = await leerTodo("papelera");
    return json({ papelera: lista.map((x) => ({ ...x.participante, fecha_papelera: x.fecha, registros: REGS.reduce((a, s) => a + (x.registros[s] || []).length, 0) })).sort((a, b) => a.codigo.localeCompare(b.codigo)) });
  }
  if (ruta === "restaurar" && req.method === "POST") {
    const codigo = String(body.codigo || "").toUpperCase();
    const x = await store("papelera").get(codigo, { type: "json" });
    if (!x) return json({ error: "No está en la papelera" }, 404);
    if (await store("participantes").get(codigo, { type: "json" })) return json({ error: `Ya existe un estudiante activo con el código ${codigo}` }, 400);
    await store("participantes").setJSON(codigo, x.participante);
    for (const s of REGS) for (const r of x.registros[s] || []) await store(s).setJSON(s === "cff" ? codigo : llave(codigo, r.momento), r);
    await store("papelera").delete(codigo);
    await bitacora("restauracion", `Participante ${codigo} restaurado desde la papelera`);
    return json({ ok: true });
  }
  if (ruta === "papelera" && req.method === "DELETE") {
    const codigo = String(url.searchParams.get("codigo") || "").toUpperCase();
    await store("papelera").delete(codigo);
    await bitacora("eliminacion", `Participante ${codigo} eliminado definitivamente desde la papelera`);
    return json({ ok: true });
  }
  if (ruta === "registro" && req.method === "PUT") {
    const s = body.store, key = KEY[s];
    if (!key || s === "cff") return json({ error: "Instrumento desconocido" }, 400);
    const r = body.row || {}, codigo = String(r.codigo || "").toUpperCase(), momento = s === "cff" ? undefined : r.momento;
    if (s !== "cff" && !MOMENTOS.includes(momento)) return json({ error: "Momento inválido" }, 400);
    if (!(await store("participantes").get(codigo, { type: "json" }))) return json({ error: "Estudiante no registrado" }, 404);
    const err = validarItems(key, r); if (err) return json({ error: err }, 400);
    const items = {}; INS[key].items.forEach((it) => (items[it.codigo] = Number(r[it.codigo])));
    const row = { codigo, ...(momento ? { momento } : {}), fecha: hoy(), ...(s === "cff" ? { informante: r.informante || "Acudiente" } : { aplicador: String(r.aplicador || "").slice(0, 80), duracion_seg: Number(r.duracion_seg) || 0 }), ...items, ...puntajes(key, items), observaciones: String(r.observaciones || "").slice(0, 500) };
    const k = llave(codigo, momento);
    const previo = (await store(s).get(k, { type: "json" })) ?? (await store(s).get(antigua(codigo, momento), { type: "json" }));
    await store(s).setJSON(k, row);
    await store(s).delete(antigua(codigo, momento));
    await bitacora(previo ? "sobrescritura" : "aplicacion", `${INS[key].nombre} ${codigo}${momento ? " " + momento : ""}`);
    return json({ ok: true, row });
  }
  if (ruta === "registro" && req.method === "DELETE") {
    const s = url.searchParams.get("store"), codigo = String(url.searchParams.get("codigo") || "").toUpperCase(), momento = url.searchParams.get("momento");
    if (!KEY[s] || (s !== "cff" && !MOMENTOS.includes(momento))) return json({ error: "Parámetros inválidos" }, 400);
    for (const k of s === "cff" ? [codigo] : [llave(codigo, momento), antigua(codigo, momento)]) await store(s).delete(k);
    await bitacora("eliminacion", `${INS[KEY[s]].nombre} ${codigo}${s === "cff" ? "" : " " + momento}`);
    return json({ ok: true });
  }
  if (ruta === "enlaces" && req.method === "GET") {
    const participantes = await leerTodo("participantes");
    const out = await Promise.all(participantes.sort((a, b) => a.codigo.localeCompare(b.codigo)).map(async (p) => ({ codigo: p.codigo, nombre: nomDe(p), grupo: p.grupo, t: await token(clave, p.codigo) })));
    return json({ enlaces: out });
  }
  return json({ error: "Ruta no encontrada" }, 404);
};

export const config = { path: "/api/*" };
