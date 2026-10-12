# Instrumentos cuantitativos · tesis doctoral N. M. Garzón Peña (CESUMA)

App web para aplicar los instrumentos de la investigación *Factores socioemocionales y su incidencia en la lectoescritura* (2.º grado, I. E. Julio César Turbay Ayala) y guardar las respuestas en una base central.

- **Aplicador** (`index.html`, con clave): registra estudiantes, aplica en pantalla el EQ-i:YV(S) y la ESMS-E leyendo cada frase en voz alta, genera los enlaces para las familias y descarga la base completa en Excel.
- **Familias** (`familia.html`, enlace firmado por estudiante y momento, sin clave): cuestionario CFCSAL-F desde el celular.
- **Datos**: Netlify Blobs (almacenes `participantes`, `eqi`, `esms`, `cff`, `bitacora`), una entrada por estudiante y momento. El Excel descargado tiene una hoja por instrumento, bitácora y diccionario de variables, con respuestas brutas y puntajes por dimensión (inversos recodificados).

## Estructura

```
public/            sitio publicado (index.html, familia.html, assets/)
netlify/functions/ api.mjs: toda la lógica de datos (ruta /api/*)
netlify/lib/       instrumentos.mjs: reactivos y escalas (generado)
fuente/            instrumentos.json: definición única de los instrumentos
build.py           regenera public/assets/instrumentos.js y netlify/lib/instrumentos.mjs
dev-local.mjs      servidor local de pruebas (node dev-local.mjs)
```

## Configuración en Netlify

Una sola variable de entorno: `APP_CLAVE`, la clave del aplicador (también firma los enlaces de las familias; si se cambia, los enlaces enviados dejan de servir y hay que generarlos de nuevo).

## Pruebas locales

```
npm install
node dev-local.mjs      # http://localhost:8888, clave APP_CLAVE de .env o, si no existe, la misma del sitio
```
