// API de la app de instrumentos. Datos en Netlify Blobs; acceso del aplicador con la clave APP_CLAVE
// (variable de entorno definida en Netlify); acceso de las familias con un enlace firmado por estudiante y momento.
import { getStore } from "@netlify/blobs";
import INS from "../lib/instrumentos.mjs";

const STORES = ["participantes", "eqi", "esms", "cff"];
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
const token = (secreto, codigo) => firmar(secreto, `familia|${codigo}`);
// Intentos fallidos de clave por dirección IP: espera de 1,5 s tras cada fallo y bloqueo de 5 minutos tras 5 fallos en 10 minutos.
const ipDe = (req) => req.headers.get("x-nf-client-connection-ip") || "local";
async function bloqueo(req) {
  const r = await store("intentos").get(ipDe(req), { type: "json" });
  if (r && r.hasta > Date.now()) return json({ error: `Demasiados intentos fallidos. Espere ${Math.ceil((r.hasta - Date.now()) / 60000)} minuto(s).` }, 429);
  return null;
}
async function fallo(req) {
  const st = store("intentos"), ip = ipDe(req), r = (await st.get(ip, { type: "json" })) || { n: 0, t: 0, hasta: 0 };
  if (Date.now() - r.t > 10 * 60000) r.n = 0; // los intentos se cuentan dentro de 10 minutos
  r.n += 1; r.t = Date.now();
  if (r.n >= 5) { r.hasta = Date.now() + 5 * 60000; r.n = 0; }
  await st.setJSON(ip, r);
  await new Promise((res) => setTimeout(res, 1500));
  return json({ error: r.hasta > Date.now() ? "Demasiados intentos fallidos. Espere 5 minutos." : "Clave incorrecta" }, r.hasta > Date.now() ? 429 : 401);
}
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
  const secreto = Netlify.env.get("FIRMA_SECRETA") || clave; // firma de los enlaces de acudientes; separada de la clave para poder cambiarla sin invalidar enlaces
  const body = req.method === "GET" || req.method === "DELETE" ? {} : await req.json().catch(() => ({}));

  // ---- familias (enlace firmado, sin clave) ----
  if (ruta === "familia") {
    const e = String(url.searchParams.get("e") || body.e || "").toUpperCase(), t = url.searchParams.get("t") || body.t;
    if (!e || !t || t !== (await token(secreto, e))) return json({ error: "Enlace no válido" }, 403);
    const p = await store("participantes").get(e, { type: "json" });
    if (!p) return json({ error: "Estudiante no registrado" }, 404);
    const previo = await store("cff").get(e, { type: "json" });
    if (req.method === "GET") return json({ ok: true, codigo: e, nombre: nomDe(p), respondido: !!previo, fecha: previo?.fecha || null, informante: previo?.informante || null });
    if (req.method === "POST") {
      if (body.acepta !== true) return json({ error: "Debe aceptar el consentimiento informado para responder" }, 400);
      if (!["Madre", "Padre", "Acudiente"].includes(body.informante)) return json({ error: "Indique quién responde: madre, padre o acudiente" }, 400);
      const err = validarItems("CFF", body.items || {});
      if (err) return json({ error: err }, 400);
      const items = {}; INS.CFF.items.forEach((it) => (items[it.codigo] = Number(body.items[it.codigo])));
      const row = { codigo: e, fecha: hoy(), fecha_hora: ahora(), informante: body.informante, consentimiento: "Sí", ...items, ...puntajes("CFF", items), observaciones: String(body.observaciones || "").slice(0, 500) };
      await store("cff").setJSON(e, row);
      await bitacora(previo ? "sobrescritura" : "aplicacion", `CFCSAL-F ${e} (acudiente por enlace)`);
      return json({ ok: true });
    }
    return json({ error: "Método no permitido" }, 405);
  }

  // ---- aplicador (clave) ----
  const bloq = await bloqueo(req); if (bloq) return bloq;
  if (ruta === "entrar") { if (body.clave === clave) { await store("intentos").delete(ipDe(req)); return json({ ok: true }); } return fallo(req); }
  if (req.headers.get("x-clave") !== clave) return fallo(req);

  if (ruta === "datos" && req.method === "GET") { // la bitácora no viaja aquí: solo con /api/bitacora o en la copia de seguridad
    const [participantes, eqi, esms, cff] = await Promise.all(STORES.map(leerTodo));
    participantes.sort((a, b) => a.codigo.localeCompare(b.codigo));
    return json({ v: 2, participantes, eqi, esms, cff });
  }
  if (ruta === "bitacora" && req.method === "GET") {
    const bit = await leerTodo("bitacora"); bit.sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora));
    return json({ bitacora: bit });
  }
  if (ruta === "copia" && req.method === "GET") { // copia de seguridad completa
    const [participantes, eqi, esms, cff, papelera, bit] = await Promise.all([...STORES, "papelera", "bitacora"].map(leerTodo));
    bit.sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora));
    await bitacora("copia", "Descarga de copia de seguridad");
    return json({ version: 1, fecha_hora: ahora(), participantes, eqi, esms, cff, papelera, bitacora: bit });
  }
  if (ruta === "copia" && req.method === "POST") { // restaurar: escribe lo que trae la copia sin borrar lo demás
    const c = body.copia || {};
    if (!Array.isArray(c.participantes)) return json({ error: "El archivo no es una copia de seguridad válida" }, 400);
    let n = 0;
    for (const p of c.participantes) if (p && /^[A-Z0-9]{1,8}$/.test(String(p.codigo || ""))) { await store("participantes").setJSON(p.codigo, p); n++; }
    for (const s of ["eqi", "esms"]) for (const r of c[s] || []) if (r && r.codigo && MOMENTOS.includes(r.momento)) { await store(s).setJSON(llave(r.codigo, r.momento), r); n++; }
    for (const r of c.cff || []) if (r && r.codigo) { await store("cff").setJSON(r.codigo, r); n++; }
    for (const x of c.papelera || []) if (x && x.participante && x.participante.codigo) { await store("papelera").setJSON(x.participante.codigo, x); n++; }
    await bitacora("restauracion_copia", `${n} registros escritos desde una copia de seguridad del ${c.fecha_hora || "?"}`);
    return json({ ok: true, n });
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
    // Ninguna aplicación se guarda sin el consentimiento informado, que el acudiente acepta al responder su enlace
    const fam = await store("cff").get(codigo, { type: "json" });
    if (!fam || fam.consentimiento !== "Sí") return json({ error: "El acudiente aún no ha aceptado el consentimiento informado (lo hace al responder su enlace); no se puede guardar la aplicación" }, 409);
    const err = validarItems(key, r); if (err) return json({ error: err }, 400);
    const items = {}; INS[key].items.forEach((it) => (items[it.codigo] = Number(r[it.codigo])));
    const row = { codigo, momento, fecha: hoy(), fecha_hora: ahora(), aplicador: String(r.aplicador || "").slice(0, 80), duracion_seg: Number(r.duracion_seg) || 0, ...items, ...puntajes(key, items), observaciones: String(r.observaciones || "").slice(0, 500) };
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
    const out = await Promise.all(participantes.sort((a, b) => a.codigo.localeCompare(b.codigo)).map(async (p) => ({ codigo: p.codigo, nombre: nomDe(p), grupo: p.grupo, t: await token(secreto, p.codigo) })));
    return json({ enlaces: out });
  }
  return json({ error: "Ruta no encontrada" }, 404);
};

export const config = { path: "/api/*" };
