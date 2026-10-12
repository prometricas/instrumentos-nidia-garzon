# App web de instrumentos (Netlify)

**Dirección:** https://instrumentos-nidia.netlify.app · **Código:** https://github.com/prometricas/instrumentos-nidia-garzon (privado; rama `main` = publicado, rama `revision` = cambios en revisión) · Última publicación: 12 de octubre de 2026 (commit 9a6815a). En revisión (rama `revision`, sin publicar): ficha ancha y editable con avatar, tabla y Excel en formato panel, WhatsApp, menú con íconos, guion en dos partes, crédito de Prométricas.

## Qué hace
- **Aplicador** (página principal, con clave; menú lateral: Estudiantes, Aplicar al estudiante, Acudientes, Tabla de respuestas): registra estudiantes por grupo (Piloto: prueba de instrumentos; Experimental: recibe la intervención; Control: sin intervención); aplica en pantalla "Factores socioemocionales" (EQ-i:YV(S), 21 frases, caras de certeza) y "Motivación hacia la lectoescritura" (ESMS-E, 18 frases, caras de acuerdo/desacuerdo sin carga emocional) leyendo cada frase en voz alta; genera los enlaces para acudientes (botón "Enviar por WhatsApp" con mensaje corto y "Copiar enlace").
- **Ficha del estudiante** (al pulsar el nombre o una marca Pre/Post): avatar de niño o niña según el sexo; "Editar estudiante" para cambiar nombre, apellido, grupo, sexo, edad y observaciones (el código no cambia); las tres pruebas lado a lado con sus dimensiones (Pretest, Postest y Cambio), quién aplicó, fecha y duración; "Aplicar ahora" o "Ir a Acudientes" en lo pendiente. Todo cabe en una pantalla sin desplazamiento.
- **Navegación:** las marcas Pre/Post pendientes llevan a Aplicar con instrumento, estudiante y momento preseleccionados; aparece "← Volver a Estudiantes" y, tras guardar, se regresa solo. El botón Atrás del navegador también vuelve al módulo anterior (cada módulo tiene su dirección: `#estudiantes`, `#aplicar`, `#familias`, `#respuestas`).
- **Tabla de respuestas y Excel (formato panel):** dos filas por estudiante (columna `Momento` = Pretest | Postest) con Grupo, Codigo, Nombre, Apellido, Momento, Sexo, Edad y, en columnas, respuestas y dimensiones con nombres cortos: Emocional `Emo1`…`Emo30` (número original del EQ-i, `R` = inverso) y `Emo_Intra`, `Emo_Inter`, `Emo_Adapt`, `Emo_Estres`, `Emo_Total`; Lectoescritura `Lec1`…`Lec9`, `Esc1`…`Esc9` y `Lec_Intrin`, `Lec_Ident`, `Lec_Contr`, `Esc_Intrin`, `Esc_Ident`, `Esc_Contr`; Familiar `Fam_Informante`, `Fam1`…`Fam12` y `Fam_Ambiente`, `Fam_Lectura`, `Fam_Apoyo`, `Fam_Total` (de una sola aplicación, se repite en ambas filas como variable fija). Los nombres de columna (`col` en `fuente/instrumentos.json`) no son las claves internas de los registros, así que pueden cambiarse sin migrar datos. En pantalla, Código, Nombre, Apellido y Momento quedan fijos al desplazar. Excel con una hoja por grupo; sin bitácora ni diccionario. Código único: el sugerido es el siguiente al mayor usado y nunca se reutiliza.
- **Acudientes** (`/familia.html?e=CÓDIGO&t=FIRMA`, sin clave): cuestionario CFCSAL-F en tres partes desde el celular, una sola aplicación transversal.
- **Protección de datos:** papelera recuperable; borrar con registros exige escribir el código; registros sueltos se eliminan solo desde la ficha con confirmación.
- **Crédito:** "Desarrollado por Prométricas S.A.S." (enlace a prometricas.com) al pie de la barra lateral, en la entrada y en la página de acudientes.
- **Datos:** Netlify Blobs (sin costo en créditos). Cada publicación a producción gasta 15 de los 300 créditos mensuales; las vistas previas no. Las aplicaciones se guardan con clave `E03-Pretest` (las antiguas `E03|Pretest` se siguen leyendo y migran al reescribir; en Windows el almacén local no las mostraba).

## Configuración en Netlify
- Variable `APP_CLAVE` (clave del aplicador; firma también los enlaces de acudientes: si cambia, los enlaces enviados dejan de servir). La clave no se guarda en el código ni en este documento.
- Proyecto público; insignia "Powered by Netlify" apagada en Project configuration → General.

## Copia local
`C:\App_web_Nidia` (clon de la rama `revision`): `git pull` para actualizar, `node dev-local.mjs` para probar en http://localhost:8888 con la clave del archivo `.env`; datos locales en `.blobs` (independientes del sitio). Un cambio en `netlify/functions/api.mjs` exige reiniciar el servidor (Ctrl+C y de nuevo `node dev-local.mjs`); los cambios en `public/` se ven con solo recargar (Ctrl+F5).
- `node test/semilla.mjs`: datos ficticios coherentes en local (separa nombre/apellido, completa los tres grupos, crea aplicaciones que falten, deja pendientes a propósito; no reemplaza lo guardado). Ejecutado en la copia local el 12 de octubre de 2026.
- `python3 test/e2e.py`: prueba de punta a punta con Playwright (registro, aplicación, acudiente, ficha, edición, papelera, tabla, Excel).

## Mantenimiento
- Reactivos, escalas, textos, guion (`guion.diga` / `guion.haga`), nombres de columna (`items[].col`, `puntajes[].col`) y nombres cortos de las dimensiones (`puntajes[].corto`) y secciones en `fuente/instrumentos.json`; tras editar, `python3 build.py` y subir.
- Flujo acordado: cambios a la rama `revision` → revisión en local → a la orden del administrador se integran en `main` (Netlify publica solo).
- El sitio publicado aún conserva 13 estudiantes ficticios de la primera prueba; borrarlos desde la app antes de usarlo con estudiantes reales.
