// Servidor local: sirve public/ y ejecuta la función api.mjs con un almacén de Blobs local en .blobs/
// (equivale a lo que hace Netlify en producción). Uso: node dev-local.mjs  →  http://localhost:8888
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { BlobsServer } from "@netlify/blobs/server";

const PORT = 8888, BLOBS_PORT = 8971, TOKEN = "local-token";
// Variables en .env (una por línea, KEY=valor): APP_CLAVE obligatoria; NETLIFY_SITE_ID y NETLIFY_TOKEN opcionales
const env = {}; if (fs.existsSync(".env")) for (const l of fs.readFileSync(".env", "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/); if (m) env[m[1]] = m[2]; }
process.env.APP_CLAVE = process.env.APP_CLAVE || env.APP_CLAVE || "nidia.2026"; // misma clave que el sitio publicado
let modo;
if (env.NETLIFY_SITE_ID && env.NETLIFY_TOKEN) { // misma base de datos que el sitio publicado
  process.env.NETLIFY_BLOBS_CONTEXT = Buffer.from(JSON.stringify({ siteID: env.NETLIFY_SITE_ID, token: env.NETLIFY_TOKEN })).toString("base64");
  modo = "datos del sitio publicado en Netlify";
} else { // base de datos local en la carpeta .blobs
  const blobs = new BlobsServer({ directory: path.resolve(".blobs"), port: BLOBS_PORT, token: TOKEN });
  await blobs.start();
  process.env.NETLIFY_BLOBS_CONTEXT = Buffer.from(JSON.stringify({ edgeURL: `http://localhost:${BLOBS_PORT}`, uncachedEdgeURL: `http://localhost:${BLOBS_PORT}`, token: TOKEN, siteID: "local-site" })).toString("base64");
  modo = "datos locales en la carpeta .blobs";
}
globalThis.Netlify = { env: { get: (k) => process.env[k] } };

const { default: api } = await import("./netlify/functions/api.mjs");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json" };

http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith("/api/")) {
      const chunks = []; for await (const c of req) chunks.push(c);
      const r = await api(new Request(`http://localhost:${PORT}${req.url}`, { method: req.method, headers: req.headers, body: chunks.length ? Buffer.concat(chunks) : undefined }));
      res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); return;
    }
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname); if (p === "/") p = "/index.html";
    const f = path.join("public", p);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end("no encontrado"); return; }
    res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(fs.readFileSync(f));
  } catch (e) { console.error(e); res.writeHead(500); res.end(String(e)); }
}).listen(PORT, () => console.log(`App local en http://localhost:${PORT}  (${modo})`));
