# Instructivo para replicar la app web de instrumentos en otra institución

Este documento está escrito para Claude (en un chat nuevo, sin ningún conocimiento previo de este proyecto) y para la persona que lo acompaña. Describe un sitio ya terminado y probado, con instrucciones para construir uno equivalente para **otra investigación, otros instrumentos y otra institución** (otro logo, otros colores), conservando el fondo y la forma del original. Corresponde a la versión publicada el 12 de octubre de 2026 (rama `main` del repositorio de referencia); no describe versiones anteriores.

## 0. Qué es el sitio de referencia

Una app web para aplicar instrumentos cuantitativos de una tesis doctoral en educación (diseño cuasiexperimental con tres grupos —Piloto, Experimental y Control— y dos momentos —Pretest y Postest—) y guardar las respuestas en una base central, lista para exportar a Excel y analizar.

- **Sitio publicado:** https://instrumentos-nidia.netlify.app (Netlify; sitio del proyecto de referencia, no se modifica desde el nuevo proyecto).
- **Código:** https://github.com/prometricas/instrumentos-nidia-garzon (repositorio privado del mismo dueño; rama `main` = publicado, rama `revision` = cambios en revisión). El nuevo chat debe pedir acceso a este repositorio (o que el usuario lo adjunte) para leer el código completo: **el código es la especificación**; este documento dice qué conservar, qué cambiar y dónde.
- **Investigación de referencia:** "Factores socioemocionales y su incidencia en la lectoescritura", Nidia Marcela Garzón Peña, doctorado en Educación (Universidad CESUMA), estudiantes de 2.º grado de la I. E. Julio César Turbay Ayala (Colombia). Instrumentos: EQ-i:YV(S) (21 frases, escala de 4, el estudiante responde en pantalla con un aplicador), ESMS-E (18 frases, escala de 5, igual) y CFCSAL-F (12 preguntas, escala de 4, lo responde el acudiente desde su celular por un enlace, una sola vez).
- **Desarrollado por** Prométricas S.A.S. (https://prometricas.com/): el crédito "Desarrollado por Prométricas S.A.S." se conserva en el nuevo sitio (pie de la barra lateral, pantalla de entrada y página de acudientes).

## 1. Primer paso obligatorio: preguntar antes de construir

Antes de crear carpetas, repositorios o código, haz estas preguntas **de forma interactiva** (con la herramienta de preguntas de opción múltiple, `AskUserQuestion`, en una sola tanda; el usuario siempre puede escribir otra respuesta):

1. **Los instrumentos a sistematizar.** Cuántos y cuáles; para cada uno: nombre y sigla, quién lo responde (el estudiante en pantalla con un aplicador que lee las frases, o el acudiente/familia desde su celular por enlace), número de ítems, escala (número de puntos y etiquetas, p. ej. "Nunca … Siempre" o "Muy rara vez … Muy a menudo"), dimensiones y qué ítems pertenecen a cada una, ítems inversos, si hay puntaje total, y si se aplica en los dos momentos (pretest y postest) o una sola vez. Ofrece como opciones: "Los mismos tres de la tesis de referencia", "Otros instrumentos: los describo o los adjunto", "Una mezcla". Pide los ítems completos (texto exacto) en un archivo o pegados en el chat; sin el texto de los ítems no se puede construir.
2. **La carpeta local en C:** donde quedará la copia de trabajo del sitio (en el proyecto de referencia fue `C:\App_web_Nidia`). Sugiere `C:\App_web_<Institución>`.
3. **El repositorio de GitHub:** nuevo o existente, dueño y nombre (en la referencia, `prometricas/instrumentos-nidia-garzon`), privado. Si es nuevo, lo crea el usuario o Claude con `gh repo create` según el acceso disponible.

En una segunda tanda (puede ser la misma si cabe) pregunta:

4. **La institución y la investigación:** nombre completo de la institución (y abreviatura para la barra lateral, p. ej. "I. E. …"), título de la investigación, nombre del investigador o investigadora, universidad, grado o curso de los estudiantes, nombre del aplicador por defecto.
5. **El logo** (archivo PNG con fondo transparente; en la referencia es horizontal, 640×136 px, y se usa a 40 px de alto en la barra lateral y 54 px en la entrada; un favicon de 128×128 px se recorta del mismo logo o del escudo).
6. **Los colores:** color principal (en la referencia azul `#00368C`) y color de acento (naranja `#F36A00`); si el usuario no los sabe, tómalos del logo (los dos tonos dominantes) y propónselos con una muestra antes de aplicarlos. Los colores de los tres grupos (gris, naranja, verde) y los de estado (verde = válido, naranja = pendiente, rojo = peligro) se conservan.
7. **El nombre del sitio en Netlify** (subdominio `<nombre>.netlify.app`) y la clave de acceso del aplicador, que el usuario define y guarda él mismo (ver §9: la clave nunca se escribe en el código, en la documentación ni en el chat).

Si el usuario responde "lo mismo que el sitio de referencia" a algo, úsalo tal cual del repositorio.

## 2. Qué se conserva y qué se cambia

**Se conserva tal cual (fondo y forma):** la arquitectura, la estructura de archivos, los módulos y su comportamiento, los textos de ayuda y su tono (español de Colombia; "usted" para acudientes y aplicador, "tú" para el niño), la pantalla del niño con íconos grandes, la seguridad, las pruebas automáticas, los nombres de columna del Excel (adaptados a los nuevos instrumentos con la misma lógica), los tres grupos con sus explicaciones, los dos momentos, los datos de prueba con los nombres graciosos (§7, obligatorios, sin cambios) y el crédito de Prométricas.

**Se cambia:** la identidad visual (logo, favicon, colores, nombre de la institución y de la investigación en todos los textos), los instrumentos (`fuente/instrumentos.json` y los puntos del código ligados a ellos, §5), el nombre del repositorio, de la carpeta y del sitio en Netlify, y el nombre del aplicador por defecto en la semilla y la prueba.

**No está en el repositorio y hay que crearlo:** el archivo `.env` local con la clave (`APP_CLAVE=…`), las variables de entorno en Netlify (`APP_CLAVE`, `FIRMA_SECRETA`) y los datos (la base de datos vive en Netlify Blobs; en local, en la carpeta `.blobs/`).

## 3. Arquitectura y archivos

Sin frameworks ni paso de compilación: HTML, CSS y JavaScript planos en el navegador; una función de Netlify como API; Netlify Blobs como base de datos. Node 20 en Netlify (`netlify.toml`), `@netlify/blobs` como única dependencia.

```
public/                      sitio publicado
  index.html                 app del aplicador (entrada con clave + módulos) y pantalla del niño
  familia.html               página del acudiente (enlace firmado, sin clave)
  assets/app.js              lógica del aplicador
  assets/familia.js          lógica de la página del acudiente
  assets/comun.js            lo compartido: api(), toast, íconos de la escala, columnas y Excel (SheetJS)
  assets/estilo.css          todos los estilos (variables de color en :root)
  assets/instrumentos.js     GENERADO por build.py (window.INS = …)
  assets/xlsx.full.min.js    SheetJS (se carga solo al descargar el Excel)
  assets/logo.png            logo de la institución o universidad (horizontal, fondo transparente)
  assets/favicon.png         128×128
netlify/functions/api.mjs    toda la API (ruta /api/*), Netlify Functions v2: export default async (req) => …; export const config = { path: "/api/*" }
netlify/lib/instrumentos.mjs GENERADO por build.py (export default …)
fuente/instrumentos.json     ÚNICA definición de los instrumentos (ítems, escalas, dimensiones, columnas, guion, consentimiento)
build.py                     genera los dos archivos de instrumentos a partir del JSON (python3 build.py)
dev-local.mjs                servidor local: sirve public/, ejecuta api.mjs y levanta un almacén de Blobs local (.blobs/); lee .env
netlify.toml                 publish = public, functions = netlify/functions, NODE_VERSION 20, cabeceras de seguridad (CSP solo scripts propios)
package.json                 dependencia @netlify/blobs; scripts dev (node dev-local.mjs) y build (python3 build.py)
test/e2e.py                  prueba de punta a punta con Playwright (Python)
test/semilla.mjs             datos ficticios coherentes para revisar en local
.github/workflows/e2e.yml    corre la prueba en GitHub en cada subida a revision o main
.gitignore                   node_modules/ .netlify/ .env .blobs/ test/*.png test/*.xlsx test/*.json test/*.csv
README.md                    descripción técnica breve, publicación, configuración, pruebas
app-web-instrumentos.md      documentación de uso y mantenimiento para el usuario (se mantiene al día con cada cambio)
```

### Módulos del aplicador (`index.html` + `app.js`)

Barra lateral fija a la izquierda (sin barra superior): arriba la **marca** (logo que al pulsarlo vuelve a Estudiantes, "Instrumentos de investigación", nombre corto de la investigación, institución; cada línea en una sola línea), el menú con íconos SVG, y al pie, en tono bajo, Copia de seguridad, Restaurar copia, Bitácora, Salir y el crédito. Navegación por hash (`#estudiantes`, `#aplicar`, `#familias`, `#respuestas`), así el botón Atrás del navegador funciona. En celular la barra pasa a horizontal (solo el logo y los íconos).

1. **Estudiantes** (título del módulo "Registro de estudiantes"): formulario (código sugerido = siguiente al mayor usado, nunca se reutiliza, ni si está en la papelera; nombre; apellido; grupo; sexo; edad), pestañas por grupo con su explicación en una sola línea ("Grupo de prueba de los instrumentos; sus datos no entran en el análisis." / "Grupo que recibe la intervención; medición antes (pretest) y después (postest)." / "Grupo sin intervención; se mide en los mismos momentos, para comparar."), tabla con marcas Pre/Post por instrumento (verde = guardada, abre la ficha; gris = pendiente, lleva a Aplicar con todo preseleccionado y un enlace "← Volver a Estudiantes" al final), buscador cuando hay más de 5 en el grupo, borrado a la papelera (si tiene registros, exige escribir el código), papelera recuperable.
2. **Ficha del estudiante** (modal ancho): avatar de niño o niña según el sexo, nombre, chip del grupo, "Editar estudiante" (subrayado; cambia todo menos el código), línea de datos, línea del consentimiento informado del acudiente (**verde** cuando aceptó y respondió: "aceptado el … (madre) · cuestionario familiar respondido"; **naranja** si está pendiente), y las pruebas lado a lado con una tabla por instrumento: dimensiones con Pretest, Postest y Cambio (verde si sube, rojo si baja), quién aplicó, fecha y hora, duración, Eliminar por registro, "Aplicar ahora" o "Ir a Acudientes" en lo pendiente. Cabe en una pantalla.
3. **Aplicar al estudiante**: elegir instrumento (solo los que responde el estudiante), buscador, estudiante, momento (Pretest/Postest) y aplicador (se recuerda). Pantalla del niño a pantalla completa: barra con logo, progreso y "x de n"; frase grande entre comillas; la pregunta de la escala arriba; botones grandes con íconos (`iconSure`: cuatro círculos crecientes para escalas de certeza de 4 puntos; `iconFace`: caritas de 5 puntos para acuerdo/desacuerdo, sin carga emocional); teclas 1-n y Enter; dos frases de práctica que no se guardan; guion para el aplicador en un panel flotante (botón "?"); al terminar, resumen de puntajes, observaciones, Guardar/Descartar. **En el postest las frases salen en un orden aleatorio distinto para cada aplicación** (Fisher-Yates en el navegador), para que el estudiante no repita de memoria ni en espejo el pretest; las respuestas se guardan por código de ítem, así que las columnas no cambian, y el orden presentado queda en el registro (campo `orden`). Una aplicación interrumpida se guarda en el dispositivo (localStorage `avance`, con el mismo orden) y se retoma con "Continuar"; si al guardar no hay conexión, queda en una cola (`colaEnvio`) que se envía sola al volver la conexión.
4. **Acudientes**: por estudiante, estado (Respondido fecha · quién / Pendiente), botón "Enviar por WhatsApp" (solo borde verde; mensaje corto: "Hola. Por favor responda este cuestionario corto (5 minutos) sobre la lectura y la escritura de *Nombre Apellido* en casa:" y el enlace solo, al final, para que WhatsApp lo convierta en hipervínculo; `*…*` = negrita) y "Copiar enlace". El nombre abre la ficha. Los datos y los enlaces firmados se traen una vez al entrar; cambiar de grupo solo vuelve a pintar.
5. **Tabla de respuestas**: formato panel (dos filas por estudiante, columna Momento), columnas fijas Código, Nombre y Momento al desplazar, bloques por instrumento con color suave, dimensiones sombreadas, "Sin aplicar" en las filas vacías, selector "Mostrar: Ítems y dimensiones / Solo dimensiones", casilla "Fecha, aplicador y duración", "x de y completos" y "Descargar Excel" (una hoja por grupo; sin bitácora ni diccionario; sin CSV). Mismos nombres de columna en pantalla y en el Excel; cada encabezado muestra la pregunta al pasar el cursor.

### Página del acudiente (`familia.html` + `familia.js`)

Móvil primero. Cabecera con logo y "Cuestionario para el acudiente · <investigación> · <institución>". Presentación con el nombre del estudiante, bloque de **consentimiento informado** (título, texto y casilla "He leído esta información y acepto participar"), selector "Quién responde" (Madre, Padre, Acudiente; nunca preseleccionado) y botón Comenzar deshabilitado hasta marcar la casilla y elegir; luego las secciones del cuestionario una por página con barra de pasos; despedida "Muchas gracias por su tiempo. Ya puede cerrar esta página." sin repetir el nombre. Si ya respondió, avisa que al enviar de nuevo reemplaza. Un enlace alterado muestra "Enlace no válido".

## 4. Modelo de datos (Netlify Blobs)

Almacenes (`getStore({ name, consistency: "strong" })`): `participantes` (clave = código), uno por instrumento (`eqi`, `esms`, `cff` en la referencia; clave = `CÓDIGO-Momento`, p. ej. `E03-Pretest`, o solo el código si es de una sola aplicación), `papelera`, `bitacora` (clave = timestamp aleatorio; `{fecha_hora, evento, detalle}`; eventos: registro, edicion, aplicacion, sobrescritura, eliminacion, papelera, restauracion, restauracion_copia, copia) e `intentos` (bloqueo por clave incorrecta).

- Participante: `{codigo, nombre, apellido, grupo, sexo, edad, fecha_registro, observaciones}`.
- Registro de un instrumento del estudiante: `{codigo, momento, fecha, fecha_hora, aplicador, duracion_seg, <un campo por ítem con su código>, <un campo por puntaje con su variable>, orden?, observaciones}`.
- Registro del acudiente: `{codigo, fecha, fecha_hora, informante, consentimiento: "Sí", <ítems>, <puntajes>, observaciones}`.
- Fechas en hora de Colombia (UTC-5): `fecha` = `AAAA-MM-DD`, `fecha_hora` = `AAAA-MM-DD HH:MM:SS`.

Rutas de la API (`api.mjs`), todas con la clave en la cabecera `x-clave` salvo `entrar` y `familia`: `entrar` POST (valida la clave; 1,5 s de espera por fallo; 5 fallos en 10 min desde una misma IP bloquean 5 min), `datos` GET (todo menos la bitácora), `bitacora` GET, `copia` GET (JSON completo: participantes, registros, papelera, bitácora) y POST (restaura escribiendo sobre los códigos que trae, sin borrar lo demás), `participante` PUT (`nuevo: true` exige código no usado ni en papelera) y DELETE (a la papelera con sus registros), `papelera` GET y DELETE (definitivo), `restaurar` POST, `registro` PUT (valida ítems en rango, recalcula puntajes en el servidor, guarda `orden` solo si es una permutación válida de los ítems) y DELETE, `enlaces` GET (código, nombre, grupo y token HMAC-SHA-256 por estudiante), `familia` GET/POST (token obligatorio; POST exige `acepta === true` e informante válido).

Seguridad: clave solo en variables de entorno; enlaces de acudientes firmados con `FIRMA_SECRETA` (si no existe, con la clave); CSP `script-src 'self'` (nada de scripts en línea: todo en archivos), `frame-ancestors 'none'`; mismas cabeceras en el servidor local.

## 5. Definición de los instrumentos (`fuente/instrumentos.json`)

Un objeto por instrumento, con una clave corta en mayúsculas (en la referencia `EQI`, `ESMS`, `CFF`). Campos:

- `id` (igual a la clave), `hoja` (nombre técnico), `nombre` (sigla, p. ej. "ESMS-E"), `titulo` (nombre completo), `variable` (constructo), `fuente` (autores), `corto` (nombre que ve el aplicador, p. ej. "Motivación hacia la lectoescritura"), `tecnico` (p. ej. "ESMS-E · 18 frases"), `tabla` (encabezado corto en la tabla de estudiantes).
- `pregunta`: la pregunta de la escala que se muestra sobre cada frase ("¿Qué tan cierto es esto para ti?").
- `escala`: lista de `{valor (1..n), etiqueta, sub}`; `sub` es una aclaración opcional bajo la etiqueta.
- `practica`: frases de práctica `{codigo, texto}` que no se guardan (dos en los instrumentos del estudiante; vacío en el del acudiente).
- `items`: `{codigo, col, dimension, inverso, texto}`. `codigo` es la clave interna del registro (no cambiarla después de tener datos); `col` es el nombre de la columna en la tabla y en el Excel (se puede cambiar sin migrar datos); `inverso: true` se recodifica como `n + 1 − v` al calcular puntajes (la respuesta cruda se guarda sin recodificar).
- `puntajes`: `{variable, col, corto, etiqueta, dimension}`; `variable` es la clave interna del puntaje, `col` su columna, `corto` el nombre en la ficha, `etiqueta` el nombre largo con el rango, p. ej. "Intrapersonal (4 reactivos, 4-16)"; `dimension` selecciona los ítems: nombre exacto de la dimensión, `"*"` = todos (total) o `"Prefijo.*"` = dimensiones que empiezan por ese prefijo. El cálculo es la suma de los ítems recodificados (`puntajes()` en `comun.js` y en `api.mjs`, misma lógica en ambos).
- `guion`: `{diga, haga}` para los instrumentos del estudiante (lo que el aplicador dice al niño y lo que hace).
- Solo el instrumento del acudiente: `instruccion_aplicador`, `consentimiento {titulo, texto, acepto}` (texto del consentimiento informado, editable) y `secciones [{titulo, dimension, intro}]` (una página del celular por sección).

Convención de nombres de columna (conservarla): ítems con prefijo corto y número (`Em01`…`Em30` con el número original del instrumento y sufijo `R` en los inversos; `Lec1`…`Lec9`, `Esc1`…`Esc9`; `F01`…`F12`); dimensiones sin prefijo cuando no hay ambigüedad (`Intrapersonal`, `Adaptabilidad`, `ManejoEstres`, `TotalEQi`; `Ambiente`, `Lectura`, `Apoyo`, `TotalCFCSAL`) y con prefijo solo si dos instrumentos comparten nombres de dimensión (`Lec_Intrinseca`, `Esc_Intrinseca`). Sin tildes ni espacios. Las columnas fijas son `Grupo, Codigo, Nombre, Apellido, Momento, Sexo, Edad, Consentimiento` (fecha de aceptación); las de metadatos opcionales, `<prefijo>_FechaHora`, `<prefijo>_Aplicador`, `<prefijo>_Duracion` e `Informante`.

Tras editar el JSON: `python3 build.py` (regenera `public/assets/instrumentos.js` y `netlify/lib/instrumentos.mjs`; ambos se suben al repositorio).

### Puntos del código ligados a las claves de los instrumentos

El JSON hace casi todo el trabajo, pero estas constantes y listas nombran los instrumentos de la referencia y deben adaptarse de forma consistente (mismo nombre de almacén en minúsculas y misma clave en mayúsculas en todas partes):

- `comun.js`: `STORE = { EQI: 'eqi', ESMS: 'esms', CFF: 'cff' }`, `PRUEBAS` (clave, nombre del bloque en la tabla, prefijo de metadatos, clase CSS del color del bloque, `panel: true` si se aplica en los dos momentos / `false` si es de una sola aplicación), `GRUPOS`, `MOMENTOS`, `buscarReg` (`key === 'CFF'` = sin momento).
- `api.mjs`: `STORES`, `REGS`, `KEY`, la ruta `familia` (usa `INS.CFF` y el almacén `cff`), `copia` POST (lista de almacenes con momento), `llaves()`.
- `app.js`: `KEYDE`, las listas `['EQI', 'ESMS', 'CFF']` (columnas de marcas en Estudiantes y pruebas de la ficha) y `['EQI', 'ESMS']` (instrumentos que se aplican en pantalla), `panel = key !== 'CFF'`, `const icon = ins.id === 'EQI' ? iconSure : iconFace` (elegir el ícono según la escala: `iconSure` para 4 puntos de certeza, `iconFace` para 5 de acuerdo; si una escala nueva tiene otro número de puntos, ampliar el ícono), `consentido()` (lee el registro del acudiente).
- `familia.js`: `const ins = INS.CFF`.
- `estilo.css`: clases `p-emo`, `p-lec`, `p-fam` (colores de los bloques de la tabla) referidas por `PRUEBAS[].css`.
- `test/semilla.mjs` y `test/e2e.py`: claves, número de ítems, códigos de estudiantes (E01…) y textos esperados.

Si la nueva investigación tiene la misma estructura (dos instrumentos del estudiante + uno del acudiente), basta renombrar; si tiene más instrumentos o ninguno del acudiente, generalizar estas listas (p. ej. derivar `['EQI','ESMS']` de `Object.keys(INS).filter(k => INS[k].practica.length)` o de un campo `responde: "estudiante" | "acudiente"` nuevo en el JSON) y ocultar el módulo Acudientes si no aplica.

## 6. Identidad visual y textos de la institución

- **Colores:** variables en `:root` de `estilo.css`: `--azul` (principal: títulos, botones, menú activo), `--azul-2` (hover), `--azul-suave` (fondos suaves), `--naranja` (acento: menú activo, borde de la marca en celular, Postest, "pendiente"), `--naranja-suave`, `--tinta`, `--tinta-2`, `--linea`, `--fondo`, `--ok` (verde), `--mal` (rojo). Cambia `--azul`, `--azul-2`, `--azul-suave`, `--naranja` y `--naranja-suave` por los de la nueva institución (derivar las variantes suave y hover del principal; comprobar contraste de texto blanco sobre el principal). Los colores de bloques de la tabla (`.r1.p-emo`, `.r1.p-lec`, `.r1.p-fam`, `td.dim`), los de los grupos (`.g-piloto`, `.g-experimental`, `.g-control`) y los de estado se conservan. Mantén el nombre de las variables aunque el color ya no sea azul o naranja, para no tocar todo el CSS.
- **Logo:** `public/assets/logo.png` (horizontal, fondo transparente). Se usa en la marca (40 px de alto), la entrada (54 px), la barra de la pantalla del niño (32 px), la cabecera de la página del acudiente y en celular (30 px). `public/assets/favicon.png` 128×128. Si el logo es cuadrado, ajusta solo las alturas.
- **Textos con el nombre de la institución o la investigación:** `index.html` (`<title>`, tarjeta de entrada: h1 "Instrumentos de investigación", nombre corto de la investigación e institución; marca de la barra lateral: `<b>Instrumentos de investigación</b>`, `<span>` investigación, `<span>` institución; `alt` del logo), `familia.html` (`<title>` y cabecera), `familia.js` (texto de presentación "sobre la lectura y la escritura en su casa"), `app.js` (`msgF`, mensaje de WhatsApp), `fuente/instrumentos.json` (`consentimiento.texto` cita la investigación y la institución; guiones), `package.json` (name, description), `README.md`, `app-web-instrumentos.md`, `test/semilla.mjs` y `test/e2e.py` (aplicador por defecto).
- **La marca en una sola línea:** la barra lateral mide `clamp(262px,16vw,300px)`; `.marca b` va a .78em y `.marca span` a .65em con `white-space:nowrap` y elipsis. Con otro nombre de investigación o institución, comprueba a 1366 px de ancho (portátil corriente) que cada línea quepa sin elipsis; si no cabe, acorta el texto (abreviar la institución) antes que reducir la fuente.
- Los textos de ayuda de cada módulo (`p.guia`) hablan de "lectura y escritura", "frases", "acudiente": ajústalos al nuevo constructo (p. ej. "preguntas" si no son frases) conservando el tono.

## 7. Datos de prueba: los nombres graciosos (se heredan tal cual)

`test/semilla.mjs` crea en local el plantel de prueba y aplicaciones con respuestas aleatorias pero coherentes con un perfil por estudiante (nivel alto/medio/bajo por constructo; en Experimental el postest mejora un poco; la motivación "controlada" no sube con la habilidad). **Estos nombres, códigos, grupos y observaciones se mantienen exactamente así en el nuevo proyecto** (solo se adaptan las columnas de perfil y de aplicaciones a los nuevos instrumentos):

| Código | Nombre | Apellido | Grupo | Sexo | Edad | Observaciones |
|---|---|---|---|---|---|---|
| E01 | Solomeo | Paredes | Piloto | Masculino | 8 | |
| E02 | Alan | Brito Delgado | Piloto | Masculino | 8 | |
| E03 | Aquiles | Esquivel Madrazo | Piloto | Masculino | 8 | |
| E04 | Joe | Hurtado Plata | Piloto | Masculino | 9 | Medio hermano de Débora Plata (E05) |
| E05 | Débora | Plata | Piloto | Femenino | 7 | Media hermana de Joe Hurtado Plata (E04) |
| E06 | Elsa | Pato Roto | Experimental | Femenino | 8 | |
| E07 | Armando | Casas de Bareque | Experimental | Masculino | 7 | |
| E08 | Ana | Tomía Forense | Experimental | Femenino | 9 | |
| E09 | Lola | Mento | Experimental | Femenino | 7 | |
| E10 | Elena | Nito del Bosque | Control | Femenino | 7 | |
| E11 | Dolores | Fuertes de Barriga | Control | Femenino | 8 | |
| E12 | Esperanza | Perdida | Control | Femenino | 8 | |
| E13 | Esteban | Dido Prieto | Control | Masculino | 8 | |

Reglas de la semilla: todos tienen aplicaciones; algunos quedan sin uno o ambos postest a propósito (E02, E03, E05, E08, E09, E12); en 8 el acudiente responde su enlace y acepta el consentimiento (E01, E02, E04, E06, E07, E08, E10, E12) y en 5 queda pendiente; el postest lleva `orden` barajado. `node test/semilla.mjs` completa sin reemplazar nada guardado; `node test/semilla.mjs --reiniciar` borra todo y vuelve a crear el plantel desde E01. Nunca se ejecuta contra el sitio publicado. La prueba de punta a punta (`test/e2e.py`) usa otros nombres de prueba y los puede conservar.

## 8. Puesta en marcha paso a paso

1. Con las respuestas de §1, crea la carpeta local indicada (o trabaja en tu entorno y entrega por GitHub si no tienes acceso al computador del usuario) y copia la estructura del repositorio de referencia (todo menos `.git`, `node_modules`, `.blobs`, `.env`).
2. Reemplaza logo, favicon, colores y textos (§6). Escribe `fuente/instrumentos.json` con los nuevos instrumentos (§5), ejecuta `python3 build.py` y adapta los puntos del código de §5. Adapta `semilla.mjs` (perfiles y aplicaciones por instrumento, nombres intactos) y `e2e.py` (claves, número de ítems, textos esperados).
3. Local: `npm install`; crea `.env` con `APP_CLAVE=<clave que el usuario elija>` (no la escribas en el chat ni en archivos versionados); `node dev-local.mjs` → http://localhost:8888; `node test/semilla.mjs --reiniciar`; revisa cada módulo en el navegador (y en ancho de celular la página del acudiente). Un cambio en `api.mjs` exige reiniciar el servidor; los de `public/` se ven con Ctrl+F5.
4. Pruebas: con la base limpia (`rm -rf .blobs` y servidor reiniciado), `python3 test/e2e.py` debe terminar sin errores (`errores: []`, código de salida 0). Requiere `pip install playwright openpyxl` y `python -m playwright install chromium`.
5. Git: ramas `main` (publicado) y `revision` (trabajo). Flujo acordado con el usuario de referencia: Claude sube a `revision`, el usuario revisa en local (`git pull`, `node dev-local.mjs`) y publica él mismo desde Git Bash: `git checkout main && git merge --ff-only revision && git push origin main && git checkout revision`. Pregunta al nuevo usuario si quiere el mismo flujo.
6. Netlify: "Add new project → Import from GitHub", elegir el repositorio y la rama `main`; la configuración de build sale de `netlify.toml` (sin comando de build; publish `public`; funciones en `netlify/functions`). Variables de entorno: `APP_CLAVE` y `FIRMA_SECRETA` (texto largo aleatorio; definirla antes de enviar enlaces reales, porque al cambiarla cambian todos los enlaces). Blobs no requiere configuración. Apagar la insignia "Powered by Netlify" (Project configuration → General). Opcional: Branch deploys para `revision` (vista previa en `revision--<sitio>.netlify.app`, comparte la base de datos del sitio publicado). Cada publicación a producción gasta 15 de los 300 créditos mensuales del plan gratuito; Blobs no gasta créditos.
7. Entrega: `README.md` y `app-web-instrumentos.md` actualizados con la nueva dirección, repositorio, instrumentos y columnas; indica al usuario los dos pendientes que siempre quedan en sus manos: definir `FIRMA_SECRETA` en Netlify y, antes de usar el sitio con estudiantes reales, que no haya datos de prueba en la base publicada.

## 9. Reglas de seguridad y de trato con el usuario

- La clave de acceso nunca va en el código, en la documentación, en los commits ni en la memoria del asistente; solo en el `.env` local del usuario y en las variables de Netlify. Si el usuario la escribe en el chat, no la repitas.
- Nada del proyecto se publica como artefacto o página pública de Claude: todo se entrega por el repositorio privado, archivos en el chat o la carpeta local.
- Nunca borres ni modifiques en bloque los datos del sitio publicado (puede haber estudiantes reales); los borrados se hacen desde la app, uno a uno, con confirmación, y los hace el usuario. "Restaurar copia" en producción sobrescribe los códigos coincidentes: advertirlo.
- La base de datos del sitio publicado y la local son independientes: la semilla y las pruebas solo tocan la local.
- Trabaja en la rama `revision`; publica en Netlify solo cuando el usuario lo pida expresamente.
- Mantén el tono de los textos: claro, breve, en español de Colombia, sin tecnicismos para el aplicador ni para las familias; los nombres de columna cortos y sin tildes; las explicaciones de los grupos empiezan por "Grupo de/que/sin…".

## 10. Lista de verificación antes de entregar

- [ ] Logo, favicon y colores de la nueva institución en entrada, barra lateral, pantalla del niño y página del acudiente; marca en una sola línea por renglón a 1366 px.
- [ ] Ningún texto menciona la investigación, la institución ni los instrumentos de referencia (buscar "Garzón", "CESUMA", "Turbay", "lectoescritura", "EQ-i", "ESMS", "CFCSAL" en todo el repositorio, salvo este instructivo si se conserva).
- [ ] `fuente/instrumentos.json` completo (ítems con texto exacto, escalas, dimensiones, inversos, columnas `col`, guion, consentimiento, secciones) y archivos generados al día.
- [ ] Pantalla del niño con el ícono adecuado a cada escala; práctica; postest barajado; retomar; cola sin conexión.
- [ ] Tabla de respuestas y Excel con las columnas nuevas, una hoja por grupo; nombres de columna según la convención.
- [ ] Semilla con los 13 nombres graciosos intactos; `python3 test/e2e.py` en verde en local y en GitHub Actions.
- [ ] `README.md` y `app-web-instrumentos.md` actualizados; crédito de Prométricas en los tres sitios; clave fuera del repositorio; `FIRMA_SECRETA` recomendada.
