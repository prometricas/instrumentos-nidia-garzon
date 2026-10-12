# Instrumentos cuantitativos · tesis doctoral N. M. Garzón Peña (CESUMA)

App web para aplicar los instrumentos de la investigación *Factores socioemocionales y su incidencia en la lectoescritura* (2.º grado, I. E. Julio César Turbay Ayala) y guardar las respuestas en una base central.

- **Aplicador** (`index.html`, con clave): registra estudiantes, aplica en pantalla el EQ-i:YV(S) y la ESMS-E leyendo cada frase en voz alta, genera los enlaces para las familias, muestra la tabla de respuestas y la descarga en Excel.
- **Acudientes** (`familia.html`, enlace firmado por estudiante, sin clave): cuestionario CFCSAL-F desde el celular, una sola aplicación.
- **Datos**: Netlify Blobs (almacenes `participantes`, `eqi`, `esms`, `cff`, `bitacora`), una entrada por estudiante y momento. La bitácora queda solo en el servidor como registro de auditoría. El módulo **Tabla de respuestas** y el Excel descargado están en formato largo (panel): dos filas por estudiante, una por momento (columna `Momento` = Pretest | Postest), con Grupo, Codigo, Nombre, Apellido, Momento, Sexo, Edad y, en columnas, las respuestas brutas y las dimensiones (inversos recodificados) de Emocional (`Emo_*`) y Lectoescritura (`Lec_*`); el cuestionario Familiar (`Fam_*`), de una sola aplicación, se repite en ambas filas como variable fija del estudiante. El Excel trae una hoja por grupo (Piloto, Experimental, Control). El código del estudiante es único y nunca se reutiliza (ni si está en la papelera; el sugerido es siempre el siguiente al mayor usado). Desde la ficha del estudiante (avatar según el sexo, tres pruebas lado a lado) se editan sus datos (no el código) y se ven sus dimensiones pre y post con el cambio. Cada módulo tiene su dirección (`#estudiantes`, `#aplicar`, `#familias`, `#respuestas`), así que el botón Atrás del navegador vuelve al módulo anterior.

La documentación de uso y mantenimiento está en `app-web-instrumentos.md`.

## Estructura

```
public/            sitio publicado (index.html, familia.html, assets/)
netlify/functions/ api.mjs: toda la lógica de datos (ruta /api/*)
netlify/lib/       instrumentos.mjs: reactivos y escalas (generado)
fuente/            instrumentos.json: definición única de los instrumentos
build.py           regenera public/assets/instrumentos.js y netlify/lib/instrumentos.mjs
dev-local.mjs      servidor local de pruebas (node dev-local.mjs)
test/              e2e.py (prueba de punta a punta con Playwright) y semilla.mjs (datos ficticios locales)
```

## Configuración en Netlify

Una sola variable de entorno: `APP_CLAVE`, la clave del aplicador (también firma los enlaces de las familias; si se cambia, los enlaces enviados dejan de servir y hay que generarlos de nuevo).

## Pruebas locales

```
npm install
node dev-local.mjs      # http://localhost:8888, clave APP_CLAVE de .env o, si no existe, la misma del sitio
```

## Datos ficticios para revisar en local
Con el servidor local encendido, `node test/semilla.mjs` separa nombre y apellido de los estudiantes que tengan todo en "Nombre", completa el plantel ficticio de los tres grupos y crea las aplicaciones que falten con respuestas aleatorias coherentes con el perfil de cada estudiante (deja algunas pendientes a propósito). No reemplaza nada ya guardado y no toca el sitio publicado.
