// Lógica del quiz activo

let perfilQuiz = null;
let preguntas = [];
let indiceCurrent = 0;
let resultados = [];

async function iniciarQuiz() {
  const resultado = await verificarSesion();
  if (!resultado) return;

  const { data: { session } } = await supabase.auth.getSession();
  perfilQuiz = await obtenerPerfil(session.user.id);
  if (!perfilQuiz) { window.location.href = '/index.html'; return; }

  const params = new URLSearchParams(window.location.search);
  const unidadId = params.get('unidad_id');
  if (!unidadId) { window.location.href = '/estudiante.html'; return; }

  await cargarPreguntas(unidadId);
}

async function cargarPreguntas(unidadId) {
  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('unidad_id', unidadId);

  if (error || !data?.length) {
    document.getElementById('quiz-contenedor').innerHTML =
      '<p class="sin-datos" style="padding:3rem;text-align:center;">No hay preguntas para esta unidad.</p>';
    return;
  }

  // Mezclar preguntas aleatoriamente
  preguntas = data.sort(() => Math.random() - 0.5);
  indiceCurrent = 0;
  resultados = [];

  document.getElementById('quiz-total').textContent = preguntas.length;
  mostrarPregunta();
}

function mostrarPregunta() {
  if (indiceCurrent >= preguntas.length) {
    finalizarQuiz();
    return;
  }

  const pregunta = preguntas[indiceCurrent];
  document.getElementById('quiz-actual').textContent = indiceCurrent + 1;

  const card = document.getElementById('quiz-pregunta-card');
  card.innerHTML = '';

  // Número de pregunta
  const numEl = document.createElement('p');
  numEl.className = 'quiz-numero';
  numEl.textContent = `Pregunta ${indiceCurrent + 1} de ${preguntas.length}`;

  // Texto de la pregunta
  const textoEl = document.createElement('div');
  textoEl.className = 'quiz-texto-pregunta';
  textoEl.innerHTML = pregunta.pregunta;

  card.appendChild(numEl);
  card.appendChild(textoEl);

  // Renderizar según el tipo
  if (pregunta.tipo === 'multiple') {
    renderizarMultiple(card, pregunta);
  } else if (pregunta.tipo === 'verdadero_falso') {
    renderizarVerdaderoFalso(card, pregunta);
  } else if (pregunta.tipo === 'numerico') {
    renderizarNumerico(card, pregunta);
  }

  // MathJax sobre el contenido inyectado
  MathJax.typesetPromise([card]);
}

function renderizarMultiple(card, pregunta) {
  const opciones = pregunta.opciones || [];
  const lista = document.createElement('div');
  lista.className = 'opciones-lista';

  opciones.forEach(opcion => {
    const btn = document.createElement('button');
    btn.className = 'opcion-btn';
    btn.textContent = opcion;
    btn.addEventListener('click', () => evaluarRespuesta(opcion, pregunta, lista));
    lista.appendChild(btn);
  });

  card.appendChild(lista);
  card.appendChild(crearFeedbackVacio());
  card.appendChild(crearBotonSiguiente(pregunta));
}

function renderizarVerdaderoFalso(card, pregunta) {
  const lista = document.createElement('div');
  lista.className = 'opciones-lista';

  ['Verdadero', 'Falso'].forEach(opcion => {
    const btn = document.createElement('button');
    btn.className = 'opcion-btn';
    btn.textContent = opcion;
    btn.addEventListener('click', () => evaluarRespuesta(opcion, pregunta, lista));
    lista.appendChild(btn);
  });

  card.appendChild(lista);
  card.appendChild(crearFeedbackVacio());
  card.appendChild(crearBotonSiguiente(pregunta));
}

function renderizarNumerico(card, pregunta) {
  const wrap = document.createElement('div');
  wrap.className = 'input-numerico';

  const input = document.createElement('input');
  input.type = 'number';
  input.step = 'any';
  input.placeholder = 'Tu respuesta…';
  input.id = 'input-numerico';

  const btn = document.createElement('button');
  btn.className = 'btn-primario';
  btn.style.width = 'auto';
  btn.textContent = 'Verificar';
  btn.addEventListener('click', () => {
    const valor = input.value.trim();
    if (valor === '') return;
    evaluarRespuesta(valor, pregunta, null);
    input.disabled = true;
    btn.disabled = true;
  });

  wrap.appendChild(input);
  wrap.appendChild(btn);
  card.appendChild(wrap);
  card.appendChild(crearFeedbackVacio());
  card.appendChild(crearBotonSiguiente(pregunta));
}

// Evalúa la respuesta del estudiante
function evaluarRespuesta(respuestaDada, pregunta, listaOpciones) {
  let esCorrecta = false;

  if (pregunta.tipo === 'numerico') {
    const dada = parseFloat(respuestaDada);
    const correcta = parseFloat(pregunta.respuesta_correcta);
    const tolerancia = Math.abs(correcta) * 0.01;
    esCorrecta = Math.abs(dada - correcta) <= tolerancia;
  } else {
    esCorrecta = respuestaDada.trim().toLowerCase() ===
      pregunta.respuesta_correcta.trim().toLowerCase();
  }

  // Deshabilitar opciones y marcar visualmente
  if (listaOpciones) {
    listaOpciones.querySelectorAll('.opcion-btn').forEach(btn => {
      btn.disabled = true;
      if (btn.textContent === respuestaDada) {
        btn.classList.add(esCorrecta ? 'correcta' : 'incorrecta');
      }
      if (!esCorrecta && btn.textContent.toLowerCase() === pregunta.respuesta_correcta.toLowerCase()) {
        btn.classList.add('correcta');
      }
    });
  }

  // Mostrar feedback
  const feedbackEl = document.querySelector('.feedback-box');
  if (feedbackEl) {
    feedbackEl.className = `feedback-box ${esCorrecta ? 'correcto' : 'incorrecto'}`;
    feedbackEl.innerHTML = esCorrecta
      ? `<strong>¡Correcto!</strong>${pregunta.explicacion ? ' ' + pregunta.explicacion : ''}`
      : `<strong>Incorrecto.</strong> La respuesta correcta es: <em>${pregunta.respuesta_correcta}</em>${pregunta.explicacion ? '. ' + pregunta.explicacion : ''}`;
    feedbackEl.hidden = false;
    MathJax.typesetPromise([feedbackEl]);
  }

  // Mostrar botón siguiente
  const btnSig = document.getElementById('btn-siguiente');
  if (btnSig) btnSig.hidden = false;

  // Guardar en la tabla progreso
  guardarProgreso(pregunta.id, respuestaDada, esCorrecta);

  // Acumular resultado para la pantalla final
  resultados.push({
    pregunta: pregunta.pregunta,
    respuestaDada,
    respuestaCorrecta: pregunta.respuesta_correcta,
    esCorrecta
  });
}

async function guardarProgreso(quizId, respuestaDada, esCorrecta) {
  await supabase.from('progreso').insert({
    usuario_id: perfilQuiz.id,
    quiz_id: quizId,
    respuesta_dada: String(respuestaDada),
    es_correcto: esCorrecta
  });
}

function crearFeedbackVacio() {
  const div = document.createElement('div');
  div.className = 'feedback-box';
  div.hidden = true;
  return div;
}

function crearBotonSiguiente(pregunta) {
  const nav = document.createElement('div');
  nav.className = 'quiz-navegacion';

  const btn = document.createElement('button');
  btn.id = 'btn-siguiente';
  btn.className = 'btn-primario';
  btn.style.width = 'auto';
  btn.textContent = indiceCurrent < preguntas.length - 1 ? 'Siguiente →' : 'Ver resultado';
  btn.hidden = true;

  btn.addEventListener('click', () => {
    indiceCurrent++;
    mostrarPregunta();
  });

  nav.appendChild(btn);
  return nav;
}

function finalizarQuiz() {
  const params = new URLSearchParams(window.location.search);
  const unidadId = params.get('unidad_id');

  // Guardar resultados en sessionStorage para la pantalla de resultado
  sessionStorage.setItem('quiz_resultados', JSON.stringify(resultados));

  window.location.href = `/resultado.html?unidad_id=${unidadId}`;
}

document.addEventListener('DOMContentLoaded', iniciarQuiz);
