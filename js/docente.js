// Lógica del panel del docente

let perfilDocente = null;
let unidades = [];

async function iniciarDocente() {
  const resultado = await verificarRol('docente');
  if (!resultado) return;

  perfilDocente = resultado.perfil;
  document.getElementById('nombre-usuario').textContent = perfilDocente.nombre;

  await cargarUnidades();
  configurarTabs();
  configurarFormularioContenido();
  configurarFormularioQuiz();
  cargarAlumnos();
}

// Carga la lista de unidades y puebla los selectores
async function cargarUnidades() {
  const { data, error } = await supabase
    .from('unidades')
    .select('*')
    .order('orden');

  if (error) return;
  unidades = data || [];

  const selectores = document.querySelectorAll('.select-unidad');
  selectores.forEach(sel => {
    sel.innerHTML = '<option value="">— Seleccioná una unidad —</option>';
    unidades.forEach(u => {
      sel.innerHTML += `<option value="${u.id}">${u.orden}. ${u.nombre}</option>`;
    });
  });
}

// Lógica de tabs
function configurarTabs() {
  const botones = document.querySelectorAll('.tab-btn');
  const paneles = document.querySelectorAll('.tab-panel');

  botones.forEach(btn => {
    btn.addEventListener('click', () => {
      botones.forEach(b => b.classList.remove('activo'));
      paneles.forEach(p => p.classList.remove('activo'));
      btn.classList.add('activo');
      document.getElementById(btn.dataset.tab).classList.add('activo');
    });
  });
}

// =============================================
// TAB 1 — CONTENIDO
// =============================================

function configurarFormularioContenido() {
  const selectUnidad = document.getElementById('sel-unidad-contenido');
  const formContenido = document.getElementById('form-contenido');
  const textareaCuerpo = document.getElementById('cont-cuerpo');
  const preview = document.getElementById('preview-cuerpo');

  selectUnidad.addEventListener('change', () => {
    if (selectUnidad.value) cargarListaContenido(selectUnidad.value);
  });

  // Vista previa con MathJax en tiempo real (con debounce)
  let timerPreview;
  textareaCuerpo.addEventListener('input', () => {
    clearTimeout(timerPreview);
    timerPreview = setTimeout(async () => {
      preview.innerHTML = textareaCuerpo.value;
      await MathJax.typesetPromise([preview]);
    }, 600);
  });

  formContenido.addEventListener('submit', async (e) => {
    e.preventDefault();
    const unidadId = selectUnidad.value;
    if (!unidadId) return;

    const titulo = document.getElementById('cont-titulo').value.trim();
    const tipo = document.getElementById('cont-tipo').value;
    const cuerpo = textareaCuerpo.value.trim();

    if (!titulo || !cuerpo) return;

    const { error } = await supabase.from('contenido').insert({
      unidad_id: unidadId,
      titulo,
      tipo,
      cuerpo,
      orden: Date.now(),
      creado_por: perfilDocente.id
    });

    if (!error) {
      formContenido.reset();
      preview.innerHTML = '';
      cargarListaContenido(unidadId);
    }
  });
}

async function cargarListaContenido(unidadId) {
  const lista = document.getElementById('lista-contenido-docente');
  lista.innerHTML = '<p class="cargando">Cargando…</p>';

  const { data, error } = await supabase
    .from('contenido')
    .select('*')
    .eq('unidad_id', unidadId)
    .order('orden');

  if (error || !data?.length) {
    lista.innerHTML = '<p class="sin-datos">Sin contenido para esta unidad.</p>';
    return;
  }

  lista.innerHTML = '';
  data.forEach(item => {
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:0.6rem 0;border-bottom:1px solid var(--borde);gap:0.5rem;';
    div.innerHTML = `
      <span style="font-size:0.9rem;">
        <span class="badge ${item.tipo === 'teoria' ? 'badge-azul' : 'badge-verde'}">
          ${item.tipo === 'teoria' ? 'Teoría' : 'Ejercicio'}
        </span>
        &nbsp;${item.titulo}
      </span>
      <button class="btn-peligro" data-id="${item.id}">Eliminar</button>
    `;
    div.querySelector('.btn-peligro').addEventListener('click', async () => {
      if (!confirm('¿Eliminar este contenido?')) return;
      await supabase.from('contenido').delete().eq('id', item.id);
      cargarListaContenido(unidadId);
    });
    lista.appendChild(div);
  });
}

// =============================================
// TAB 2 — QUIZZES
// =============================================

function configurarFormularioQuiz() {
  const selectUnidad = document.getElementById('sel-unidad-quiz');
  const formQuiz = document.getElementById('form-quiz');
  const tipoSelect = document.getElementById('quiz-tipo');
  const camposMultiple = document.getElementById('campos-multiple');

  selectUnidad.addEventListener('change', () => {
    if (selectUnidad.value) cargarListaQuiz(selectUnidad.value);
  });

  tipoSelect.addEventListener('change', () => {
    camposMultiple.hidden = tipoSelect.value !== 'multiple';
  });

  formQuiz.addEventListener('submit', async (e) => {
    e.preventDefault();
    const unidadId = selectUnidad.value;
    if (!unidadId) return;

    const pregunta = document.getElementById('quiz-pregunta').value.trim();
    const tipo = tipoSelect.value;
    const respuestaCorrecta = document.getElementById('quiz-respuesta').value.trim();
    const explicacion = document.getElementById('quiz-explicacion').value.trim();

    if (!pregunta || !respuestaCorrecta) return;

    let opciones = null;
    if (tipo === 'multiple') {
      opciones = [
        document.getElementById('op-a').value.trim(),
        document.getElementById('op-b').value.trim(),
        document.getElementById('op-c').value.trim(),
        document.getElementById('op-d').value.trim()
      ].filter(Boolean);
      if (opciones.length < 2) {
        alert('Ingresá al menos 2 opciones.');
        return;
      }
    }

    const { error } = await supabase.from('quizzes').insert({
      unidad_id: unidadId,
      pregunta,
      tipo,
      opciones,
      respuesta_correcta: respuestaCorrecta,
      explicacion: explicacion || null,
      creado_por: perfilDocente.id
    });

    if (!error) {
      formQuiz.reset();
      camposMultiple.hidden = true;
      cargarListaQuiz(unidadId);
    }
  });
}

async function cargarListaQuiz(unidadId) {
  const lista = document.getElementById('lista-quiz-docente');
  lista.innerHTML = '<p class="cargando">Cargando…</p>';

  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('unidad_id', unidadId);

  if (error || !data?.length) {
    lista.innerHTML = '<p class="sin-datos">Sin preguntas para esta unidad.</p>';
    return;
  }

  lista.innerHTML = '';
  data.forEach((q, idx) => {
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;padding:0.7rem 0;border-bottom:1px solid var(--borde);gap:0.5rem;';
    div.innerHTML = `
      <span style="font-size:0.9rem;flex:1;">
        <strong>${idx + 1}.</strong> ${q.pregunta}
        <span class="badge badge-azul" style="margin-left:0.4rem;">${q.tipo}</span>
      </span>
      <button class="btn-peligro" data-id="${q.id}">Eliminar</button>
    `;
    div.querySelector('.btn-peligro').addEventListener('click', async () => {
      if (!confirm('¿Eliminar esta pregunta?')) return;
      await supabase.from('quizzes').delete().eq('id', q.id);
      cargarListaQuiz(unidadId);
    });
    lista.appendChild(div);
  });
}

// =============================================
// TAB 3 — ALUMNOS
// =============================================

async function cargarAlumnos() {
  const tabla = document.getElementById('tbody-alumnos');
  tabla.innerHTML = '<tr><td colspan="5" class="cargando">Cargando alumnos…</td></tr>';

  const { data: alumnos, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('rol', 'estudiante')
    .order('nombre');

  if (error || !alumnos?.length) {
    tabla.innerHTML = '<tr><td colspan="5" class="sin-datos">Sin alumnos registrados.</td></tr>';
    return;
  }

  tabla.innerHTML = '';

  for (const alumno of alumnos) {
    // Vistas de contenido
    const { count: vistas } = await supabase
      .from('vistas_contenido')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', alumno.id);

    // Promedio en quizzes
    const { data: progresos } = await supabase
      .from('progreso')
      .select('es_correcto')
      .eq('usuario_id', alumno.id);

    let promedio = '—';
    if (progresos?.length) {
      const correctas = progresos.filter(p => p.es_correcto).length;
      promedio = `${Math.round((correctas / progresos.length) * 100)}%`;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${alumno.nombre}</td>
      <td>${alumno.email}</td>
      <td>${alumno.legajo || '—'}</td>
      <td>${vistas ?? 0}</td>
      <td>${promedio}</td>
    `;
    tr.addEventListener('click', () => mostrarDetalleAlumno(alumno));
    tabla.appendChild(tr);
  }
}

async function mostrarDetalleAlumno(alumno) {
  const contenedor = document.getElementById('detalle-alumno');
  contenedor.innerHTML = '<p class="cargando">Cargando detalle…</p>';
  contenedor.hidden = false;

  const { data: progresos } = await supabase
    .from('progreso')
    .select('*, quizzes(pregunta, respuesta_correcta)')
    .eq('usuario_id', alumno.id)
    .order('fecha', { ascending: false });

  if (!progresos?.length) {
    contenedor.innerHTML = `<h3>${alumno.nombre}</h3><p class="sin-datos">Sin actividad en quizzes.</p>`;
    return;
  }

  const filas = progresos.map(p => `
    <tr>
      <td>${p.quizzes?.pregunta || '—'}</td>
      <td>${p.respuesta_dada}</td>
      <td>${p.quizzes?.respuesta_correcta || '—'}</td>
      <td>${p.es_correcto ? '✓' : '✗'}</td>
    </tr>
  `).join('');

  contenedor.innerHTML = `
    <h3 style="margin-bottom:0.75rem;">Detalle: ${alumno.nombre}</h3>
    <table>
      <thead>
        <tr>
          <th>Pregunta</th>
          <th>Respuesta dada</th>
          <th>Correcta</th>
          <th>Resultado</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
  `;
}

document.addEventListener('DOMContentLoaded', iniciarDocente);
