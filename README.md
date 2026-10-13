# Instrumentos cuantitativos · tesis doctoral N. M. Garzón Peña (CESUMA)

App web para aplicar los instrumentos de la investigación *Factores socioemocionales y su incidencia en la lectoescritura* (2.º grado, I. E. Julio César Turbay Ayala) y guardar las respuestas en una base central.

- **Aplicador** (`index.html`, con clave): registra estudiantes, aplica en pantalla el EQ-i:YV(S) y la ESMS-E leyendo cada frase en voz alta, genera los enlaces para las familias, muestra la tabla de respuestas y la descarga en Excel.
- **Acudientes** (`familia.html`, enlace firmado por estudiante, sin clave): cuestionario CFCSAL-F desde el celular, una sola aplicación.
- **Datos**: Netlify Blobs (almacenes `participantes`, `eqi`, `esms`, `cff`, `bitacora`), una entrada por estudiante y momento. La bitácora queda solo en el servidor como registro de auditoría. El módulo **Tabla de respuestas** y el Excel descargado están en formato largo (panel): dos filas por estudiante, una por momento (columna `Momento` = Pretest | Postest), con Grupo, Codigo, Nombre, Apellido, Momento, Sexo, Edad y, en columnas, las respuestas brutas y las dimensiones (inversos recodificados): Emocional `Em01`…`Em30` (número original del EQ-i, dos cifras, `R` = reactivo inverso) con `Intrapersonal`, `Interpersonal`, `Adaptabilidad`, `ManejoEstres`, `TotalEQi`; Lectoescritura `Lec1`…`Lec9`, `Esc1`…`Esc9` con `Lec_Intrinseca`, `Lec_Identificada`, `Lec_Controlada`, `Esc_Intrinseca`, `Esc_Identificada`, `Esc_Controlada` (único bloque con prefijo en las dimensiones, para no confundirlas); el cuestionario Familiar `Informante`, `F01`…`F12` con `Ambiente`, `Lectura`, `Apoyo`, `TotalCFCSAL`, de una sola aplicación, se repite en ambas filas como variable fija del estudiante. Los nombres de columna (`col` en `fuente/instrumentos.json`) son independientes de las claves internas con que se guardan las respuestas, así que pueden cambiarse sin migrar datos. El Excel trae una hoja por grupo (Piloto, Experimental, Control). El código del estudiante es único y nunca se reutiliza (ni si está en la papelera; el sugerido es siempre el siguiente al mayor usado). Desde la ficha del estudiante (avatar según el sexo, tres pruebas lado a lado) se editan sus datos, incluido el código (sus registros lo siguen; si otro estudiante ya lo tiene, el mensaje dice quién y pide cambiarle primero el suyo), y se ven sus dimensiones pre y post con el cambio. Cada módulo tiene su dirección (`#estudiantes`, `#aplicar`, `#familias`, `#respuestas`), así que el botón Atrás del navegador vuelve al módulo anterior.

Además: postest con las frases en orden aleatorio por estudiante (el orden presentado se guarda en el registro, campo `orden`; las columnas no cambian), consentimiento informado (el acudiente lo acepta al responder su enlace, requisito solo de ese cuestionario; las aplicaciones al estudiante se guardan con o sin él; en la ficha va en verde cuando ya respondió), copia de seguridad completa en JSON, restauración y visor de bitácora (al pie de la barra lateral, junto a Salir), aplicación interrumpida que se retoma en el mismo dispositivo, cola de envío cuando no hay conexión, buscador, Excel con metadatos opcionales (fecha y hora, aplicador, duración).

La documentación de uso y mantenimiento está en `app-web-instrumentos.md`; `INSTRUCTIVO-REPLICAR.md` explica cómo replicar el sitio para otra investigación e institución.

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

## Publicar en Netlify

Netlify publica solo lo que llegue a la rama `main`. Desde la copia local (Git Bash):

```
git checkout main
git merge --ff-only revision
git push origin main
git checkout revision
```

## Configuración en Netlify

Variables de entorno: `APP_CLAVE` (clave del aplicador) y, recomendada, `FIRMA_SECRETA` (firma los enlaces de los acudientes; si no existe se usa la clave, y entonces cambiar la clave invalida los enlaces ya enviados). Tras 5 claves incorrectas en 10 minutos desde una misma dirección, el acceso se bloquea 5 minutos; cada fallo espera 1,5 s. `netlify.toml` fija Node 20 y las cabeceras de seguridad (CSP solo con scripts propios, sin marcos).

## Pruebas locales

```
npm install
echo "APP_CLAVE=su_clave" > .env     # la clave nunca va en el código
node dev-local.mjs                    # http://localhost:8888
python3 test/e2e.py                   # prueba de punta a punta (Playwright); también corre en GitHub en cada subida
```

## Datos ficticios para revisar en local
Con el servidor local encendido, `node test/semilla.mjs` completa el plantel ficticio de los tres grupos y crea las aplicaciones que falten con respuestas aleatorias coherentes con el perfil de cada estudiante; en algunos el acudiente responde su enlace (aceptando el consentimiento) y en otros queda pendiente a propósito. No reemplaza nada ya guardado. `node test/semilla.mjs --reiniciar` borra todos los estudiantes y la papelera y vuelve a crear el plantel desde E01. Nada de esto toca el sitio publicado.
