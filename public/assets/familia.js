const ins = INS.CFF, q = new URLSearchParams(location.search);
const par = { e: (q.get('e') || '').toUpperCase(), t: q.get('t') || '' };
const SEC = ins.secciones.map((s) => ({ ...s, items: ins.items.filter((it) => it.dimension === s.dimension) }));
const resp = {};
let info = null, paso = -1; // -1 = presentación, 0..n-1 = secciones

function final(html) { $('#main').innerHTML = `<div class="tarjeta" style="text-align:center;padding:30px 22px">${html}</div>`; }
const quien = () => info.nombre ? `<b>${esc(info.nombre)}</b> (${esc(info.codigo)})` : `<b>${esc(info.codigo)}</b>`;
const barra = () => `<div class="pasos">${SEC.map((s, i) => `<span class="${i < paso ? 'hecho' : i === paso ? 'actual' : ''}"></span>`).join('')}</div>`;

function render() {
  window.scrollTo(0, 0);
  if (paso < 0) {
    $('#main').innerHTML = `<h2>Acudiente de ${quien()}</h2>
      <p class="guia">Gracias por participar. Le haremos ${ins.items.length} preguntas breves, en ${SEC.length} partes, sobre la lectura y la escritura en su casa. Toma unos 5 minutos y no hay respuestas buenas ni malas.</p>
      ${info.respondido ? `<div class="aviso nota">Este cuestionario ya fue respondido el ${esc(info.fecha)}. Si lo envía de nuevo, reemplazará las respuestas anteriores.</div>` : ''}
      <div class="tarjeta consentimiento"><h3>${esc(ins.consentimiento.titulo)}</h3><p>${esc(ins.consentimiento.texto)}</p><label class="check" for="acepto"><input type="checkbox" id="acepto"> ${esc(ins.consentimiento.acepto)}</label></div>
      <div class="tarjeta"><div class="campo"><label for="quien">Quién responde</label><select id="quien" class="vacio"><option value="" disabled selected>Seleccione quién responde</option><option>Madre</option><option>Padre</option><option>Acudiente</option></select></div></div>
      <div id="msg"></div>
      <div class="pie"><div style="flex:1"><button class="btn grande naranja" id="comenzar" style="width:100%" disabled>Comenzar</button><p class="guia pista" id="pista" style="margin:8px 0 0;font-size:.88em;text-align:center">Marque la casilla y elija quién responde para comenzar.</p></div></div>`;
    if (info.informante) $('#quien').value = info.informante; // si ya respondió antes, se recuerda; si no, debe elegir
    $('#quien').classList.toggle('vacio', !$('#quien').value);
    $('#acepto').checked = !!info.acepta;
    const listo = () => { const ok = $('#acepto').checked && !!$('#quien').value; $('#comenzar').disabled = !ok; $('#pista').classList.toggle('oculto', ok); return ok; };
    $('#quien').addEventListener('change', () => { $('#quien').classList.toggle('vacio', !$('#quien').value); listo(); });
    $('#acepto').addEventListener('change', listo);
    listo();
    $('#comenzar').addEventListener('click', () => {
      if (!listo()) { $('#msg').innerHTML = `<div class="aviso mal">${!$('#acepto').checked ? 'Marque la casilla de aceptación del consentimiento informado.' : 'Elija quién responde: madre, padre o acudiente.'}</div>`; return; }
      info.acepta = true; info.informante = $('#quien').value; paso = 0; render();
    });
    return;
  }
  const s = SEC[paso], ultimo = paso === SEC.length - 1;
  $('#main').innerHTML = `${barra()}<div class="seccion"><h3>${esc(s.titulo)}</h3><p class="intro">Parte ${paso + 1} de ${SEC.length} · ${esc(s.intro)} Marque con qué frecuencia ocurre.</p>
    ${s.items.map((it) => `<div class="item" id="it-${it.codigo}"><div class="txt">${esc(it.texto)}</div><div class="ops">${ins.escala.map((e) => `<button data-c="${it.codigo}" data-v="${e.valor}" class="${resp[it.codigo] === e.valor ? 'sel' : ''}">${esc(e.etiqueta)}</button>`).join('')}</div></div>`).join('')}
    ${ultimo ? '<div class="tarjeta"><div class="campo"><label for="obs">Comentarios (opcional)</label><textarea id="obs" rows="2"></textarea></div></div>' : ''}
    <div id="msg"></div></div>
    <div class="pie"><button class="btn sec grande" id="atras">Atrás</button><button class="btn grande ${ultimo ? 'naranja' : ''}" id="sig">${ultimo ? 'Enviar respuestas' : 'Siguiente'}</button></div>`;
  if (ultimo && info.obs) $('#obs').value = info.obs;
  $('#main').querySelectorAll('.ops button').forEach((b) => b.addEventListener('click', () => {
    resp[b.dataset.c] = Number(b.dataset.v);
    const it = $('#it-' + b.dataset.c); it.classList.remove('falta');
    it.querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x === b));
    const sig = it.nextElementSibling; if (sig && sig.classList.contains('item')) sig.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }));
  $('#atras').addEventListener('click', () => { if (ultimo) info.obs = $('#obs').value; paso--; render(); });
  $('#sig').addEventListener('click', () => {
    const faltan = s.items.filter((it) => resp[it.codigo] == null);
    if (faltan.length) {
      faltan.forEach((it) => $('#it-' + it.codigo).classList.add('falta'));
      $('#msg').innerHTML = `<div class="aviso mal">Falta responder ${faltan.length === 1 ? 'una pregunta' : faltan.length + ' preguntas'} de esta parte (marcadas en naranja).</div>`;
      $('#it-' + faltan[0].codigo).scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (ultimo) enviar(); else { paso++; render(); }
  });
}

async function enviar() {
  $('#sig').disabled = true; $('#msg').innerHTML = '';
  try {
    await api('familia', { method: 'POST', body: { ...par, informante: info.informante, acepta: info.acepta === true, items: resp, observaciones: $('#obs').value.trim() } });
    final(`<img src="assets/logo.png" alt="" style="height:44px;margin-bottom:14px"><h2>Respuestas enviadas</h2><p class="guia" style="margin:0">Muchas gracias por su tiempo y por apoyar el aprendizaje de ${esc(info.nombre || info.codigo)}. Ya puede cerrar esta página.</p>`);
  } catch (e) {
    $('#msg').innerHTML = `<div class="aviso mal">No se pudieron enviar las respuestas: ${esc(e.message)}. Revise la conexión e intente de nuevo.</div>`;
    $('#sig').disabled = false;
  }
}

(async () => {
  try { info = await api(`familia?e=${encodeURIComponent(par.e)}&t=${encodeURIComponent(par.t)}`); render(); }
  catch (e) { final(`<h2>Enlace no válido</h2><p class="guia" style="margin:0">${esc(e.message)}. Pida a la docente investigadora que le envíe de nuevo el enlace.</p>`); }
})();
