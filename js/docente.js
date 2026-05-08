// Lógica del panel del docente

let perfilDocente = null;
let unidades = [];
let comisiones = [];

async function iniciarDocente() {
  const resultado = await verificarRol('docente');
  if (!resultado) return;

  perfilDocente = resultado.perfil;
  document.getElementById('nombre-usuario').textContent = perfilDocente.nombre;

  await cargarUnidades();
  await cargarComisionesGlobal();
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

      // Carga lazy por tab
      if (btn.dataset.tab === 'tab-comisiones') cargarTabComisiones();
      if (btn.dataset.tab === 'tab-entregas') cargarEntregasDocente();
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
// COMISIONES — carga global y poblado de filtros
// =============================================

async function cargarComisionesGlobal() {
  const { data, error } = await supabase
    .from('comisiones')
    .select('*')
    .order('nombre');

  if (error) return;
  comisiones = data || [];

  // Poblar filtros de selects en toda la página
  ['filtro-comision', 'filtro-comision-entregas'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '<option value="">Todas</option>';
    comisiones.forEach(c => {
      sel.innerHTML += `<option value="${c.id}">${c.nombre}${c.turno ? ' — ' + c.turno : ''}</option>`;
    });
  });
}

// =============================================
// TAB 3 — ALUMNOS
// =============================================

async function cargarAlumnos(comisionId = '') {
  const tabla = document.getElementById('tbody-alumnos');
  tabla.innerHTML = '<tr><td colspan="6" class="cargando">Cargando alumnos…</td></tr>';

  let query = supabase
    .from('usuarios')
    .select('*, comisiones(nombre, turno)')
    .eq('rol', 'estudiante')
    .order('nombre');

  if (comisionId) query = query.eq('comision_id', comisionId);

  const { data: alumnos, error } = await query;

  if (error || !alumnos?.length) {
    tabla.innerHTML = '<tr><td colspan="6" class="sin-datos">Sin alumnos registrados.</td></tr>';
    return;
  }

  tabla.innerHTML = '';

  for (const alumno of alumnos) {
    const { count: vistas } = await supabase
      .from('vistas_contenido')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', alumno.id);

    const { data: progresos } = await supabase
      .from('progreso')
      .select('es_correcto')
      .eq('usuario_id', alumno.id);

    let promedio = '—';
    if (progresos?.length) {
      const correctas = progresos.filter(p => p.es_correcto).length;
      promedio = `${Math.round((correctas / progresos.length) * 100)}%`;
    }

    const nombreComision = alumno.comisiones
      ? `${alumno.comisiones.nombre}${alumno.comisiones.turno ? ' ' + alumno.comisiones.turno : ''}`
      : '—';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${alumno.nombre}</td>
      <td>${alumno.email}</td>
      <td>${alumno.legajo || '—'}</td>
      <td>${nombreComision}</td>
      <td>${vistas ?? 0}</td>
      <td>${promedio}</td>
    `;
    tr.addEventListener('click', () => mostrarDetalleAlumno(alumno));
    tabla.appendChild(tr);
  }
}

// Filtro de comisión en la tabla de alumnos
document.addEventListener('DOMContentLoaded', () => {
  const filtro = document.getElementById('filtro-comision');
  if (filtro) filtro.addEventListener('change', () => cargarAlumnos(filtro.value));
});

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

// =============================================
// TAB 4 — COMISIONES
// =============================================

async function cargarTabComisiones() {
  const contenedor = document.getElementById('lista-comisiones');
  contenedor.innerHTML = '<p class="cargando">Cargando…</p>';

  const { data, error } = await supabase
    .from('comisiones')
    .select('*')
    .order('nombre');

  if (error || !data?.length) {
    contenedor.innerHTML = '<p class="sin-datos">No hay comisiones creadas.</p>';
    return;
  }

  contenedor.innerHTML = '';
  for (const comision of data) {
    contenedor.appendChild(await crearCardComision(comision));
  }
}

async function crearCardComision(comision) {
  const card = document.createElement('div');
  card.style.cssText = 'background:var(--blanco);border-radius:8px;box-shadow:var(--sombra);padding:1.5rem;';

  // Formulario de edición
  card.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem;">
      <h3 style="margin:0;">${comision.nombre}${comision.turno ? ' — ' + comision.turno : ''}</h3>
      <button class="btn-secundario btn-editar-comision" style="width:auto;">Editar datos</button>
    </div>

    <form class="form-editar-comision" hidden style="display:flex;gap:0.75rem;flex-wrap:wrap;align-items:flex-end;margin-bottom:1rem;">
      <div class="campo" style="flex:1;min-width:160px;margin-bottom:0;">
        <label>Nombre</label>
        <input type="text" class="inp-nombre-comision" value="${comision.nombre}" required />
      </div>
      <div class="campo" style="flex:1;min-width:140px;margin-bottom:0;">
        <label>Turno</label>
        <input type="text" class="inp-turno-comision" value="${comision.turno || ''}" placeholder="Mañana, Tarde…" />
      </div>
      <button type="submit" class="btn-primario" style="width:auto;margin-bottom:0;">Guardar</button>
      <button type="button" class="btn-cancelar-edicion btn-secundario" style="width:auto;margin-bottom:0;">Cancelar</button>
    </form>

    <h4 style="margin-bottom:0.75rem;">Alumnos asignados</h4>
    <div class="lista-asignados" style="display:flex;flex-direction:column;gap:0.4rem;min-height:40px;margin-bottom:1rem;"></div>

    <h4 style="margin-bottom:0.75rem;">Sin comisión asignada</h4>
    <div class="lista-sin-asignar" style="display:flex;flex-direction:column;gap:0.4rem;"></div>
  `;

  // Toggle edición
  const btnEditar = card.querySelector('.btn-editar-comision');
  const formEditar = card.querySelector('.form-editar-comision');
  const btnCancelar = card.querySelector('.btn-cancelar-edicion');

  btnEditar.addEventListener('click', () => {
    formEditar.hidden = false;
    formEditar.style.display = 'flex';
    btnEditar.hidden = true;
  });
  btnCancelar.addEventListener('click', () => {
    formEditar.hidden = true;
    btnEditar.hidden = false;
  });

  formEditar.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = card.querySelector('.inp-nombre-comision').value.trim();
    const turno = card.querySelector('.inp-turno-comision').value.trim();
    await supabase.from('comisiones').update({ nombre, turno }).eq('id', comision.id);
    await cargarComisionesGlobal();
    await cargarTabComisiones();
  });

  // Cargar alumnos asignados y sin asignar
  await renderAsignaciones(card, comision.id);

  return card;
}

async function renderAsignaciones(card, comisionId) {
  const { data: todos } = await supabase
    .from('usuarios')
    .select('id, nombre, email, comision_id')
    .eq('rol', 'estudiante')
    .order('nombre');

  const asignados = (todos || []).filter(u => u.comision_id === comisionId);
  const sinAsignar = (todos || []).filter(u => !u.comision_id);

  const listaAsignados = card.querySelector('.lista-asignados');
  const listaSin = card.querySelector('.lista-sin-asignar');

  const renderFila = (alumno, estaAsignado) => {
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:0.4rem 0.6rem;background:var(--fondo);border-radius:6px;';
    div.innerHTML = `
      <span style="font-size:0.9rem;">${alumno.nombre} <span style="color:var(--texto-suave);font-size:0.8rem;">${alumno.email}</span></span>
      <button class="btn-${estaAsignado ? 'peligro' : 'primario'}" style="width:auto;padding:0.25rem 0.75rem;font-size:0.8rem;">
        ${estaAsignado ? 'Quitar' : 'Asignar'}
      </button>
    `;
    div.querySelector('button').addEventListener('click', async () => {
      await supabase.from('usuarios')
        .update({ comision_id: estaAsignado ? null : comisionId })
        .eq('id', alumno.id);
      await cargarComisionesGlobal();
      await renderAsignaciones(card, comisionId);
    });
    return div;
  };

  listaAsignados.innerHTML = '';
  if (asignados.length) {
    asignados.forEach(a => listaAsignados.appendChild(renderFila(a, true)));
  } else {
    listaAsignados.innerHTML = '<p class="sin-datos" style="font-size:0.85rem;">Ningún alumno asignado aún.</p>';
  }

  listaSin.innerHTML = '';
  if (sinAsignar.length) {
    sinAsignar.forEach(a => listaSin.appendChild(renderFila(a, false)));
  } else {
    listaSin.innerHTML = '<p class="sin-datos" style="font-size:0.85rem;">Todos los alumnos están asignados.</p>';
  }
}

// =============================================
// TAB 5 — ENTREGAS
// =============================================

async function cargarEntregasDocente(comisionId = '') {
  const contenedor = document.getElementById('lista-entregas-docente');
  contenedor.innerHTML = '<p class="cargando">Cargando entregas…</p>';

  let query = supabase
    .from('entregas')
    .select(`
      *,
      usuarios!inner(nombre, email, comision_id, comisiones(nombre))
    `)
    .order('created_at', { ascending: false });

  if (comisionId) {
    query = query.eq('usuarios.comision_id', comisionId);
  }

  const { data: entregas, error } = await query;

  if (error || !entregas?.length) {
    contenedor.innerHTML = '<p class="sin-datos">No hay entregas todavía.</p>';
    return;
  }

  contenedor.innerHTML = '';
  for (const entrega of entregas) {
    contenedor.appendChild(await crearCardEntregaDocente(entrega));
  }
}

async function crearCardEntregaDocente(entrega) {
  const alumno = entrega.usuarios;
  const comisionNombre = alumno?.comisiones?.nombre || '—';
  const fecha = new Date(entrega.created_at).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' });

  const estadoBadge = {
    pendiente:   '<span class="badge" style="background:#fef3c7;color:#92400e;">Pendiente</span>',
    procesando:  '<span class="badge" style="background:#dbeafe;color:#1e40af;">Procesando…</span>',
    corregida:   '<span class="badge" style="background:#d1fae5;color:#065f46;">Corregida ✓</span>',
  }[entrega.estado] || entrega.estado;

  // Obtener corrección si existe
  const { data: corrData } = await supabase
    .from('correcciones')
    .select('*')
    .eq('entrega_id', entrega.id)
    .order('created_at', { ascending: false })
    .limit(1);
  const correccion = corrData?.[0] ?? null;

  const card = document.createElement('div');
  card.style.cssText = 'background:var(--blanco);border-radius:8px;box-shadow:var(--sombra);padding:1.25rem;';

  const imagenesHTML = (entrega.imagenes || []).map(url =>
    `<a href="${url}" target="_blank">
      <img src="${url}" alt="Imagen de entrega" style="width:100px;height:100px;object-fit:cover;border-radius:6px;border:1px solid var(--borde);" />
    </a>`
  ).join('');

  const correccionHTML = correccion ? `
    <div style="margin-top:1rem;padding:1rem;background:var(--fondo);border-radius:8px;border-left:4px solid var(--primario);">
      <h4 style="margin-bottom:0.75rem;">Corrección IA</h4>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0.75rem;margin-bottom:0.75rem;">
        ${renderDimension('Planteamiento', correccion.planteamiento_puntaje, correccion.planteamiento_feedback)}
        ${renderDimension('Procedimiento', correccion.procedimiento_puntaje, correccion.procedimiento_feedback)}
        ${renderDimension('Resultado', correccion.resultado_puntaje, correccion.resultado_feedback)}
      </div>
      ${correccion.comentario_general ? `<p style="font-size:0.9rem;"><strong>Comentario general:</strong> ${correccion.comentario_general}</p>` : ''}
      ${renderVideosDocente(correccion.videos_sugeridos)}
    </div>
  ` : '';

  card.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;">
      <div>
        <strong>${alumno?.nombre || '—'}</strong>
        <span style="color:var(--texto-suave);font-size:0.85rem;margin-left:0.5rem;">${comisionNombre}</span>
        <span style="color:var(--texto-suave);font-size:0.8rem;margin-left:0.5rem;">${fecha}</span>
      </div>
      ${estadoBadge}
    </div>
    <p style="font-weight:600;margin-bottom:0.5rem;">${entrega.titulo}</p>
    ${entrega.descripcion ? `<p style="font-size:0.875rem;color:var(--texto-suave);margin-bottom:0.75rem;">${entrega.descripcion}</p>` : ''}
    <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;">${imagenesHTML}</div>
    ${entrega.estado === 'pendiente' ? `
      <button class="btn-primario btn-corregir" data-id="${entrega.id}" style="width:auto;">
        Corregir con IA
      </button>` : ''}
    ${correccionHTML}
  `;

  card.querySelector('.btn-corregir')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = 'Enviando…';
    await iniciarCorreccion(entrega.id);
    await cargarEntregasDocente(document.getElementById('filtro-comision-entregas').value);
  });

  return card;
}

function renderDimension(label, puntaje, feedback) {
  const color = puntaje >= 7 ? '#065f46' : puntaje >= 4 ? '#92400e' : '#991b1b';
  const bg    = puntaje >= 7 ? '#d1fae5' : puntaje >= 4 ? '#fef3c7' : '#fee2e2';
  return `
    <div style="background:${bg};padding:0.75rem;border-radius:6px;">
      <div style="font-weight:600;color:${color};margin-bottom:0.25rem;">${label}: ${puntaje ?? '—'}/10</div>
      <div style="font-size:0.85rem;">${feedback || ''}</div>
    </div>`;
}

function renderVideosDocente(videos) {
  if (!videos?.length) return '';
  const items = videos.map(v =>
    `<li><a href="${v.url}" target="_blank" style="color:var(--primario);">${v.titulo}</a></li>`
  ).join('');
  return `<div style="margin-top:0.5rem;"><strong style="font-size:0.9rem;">Videos sugeridos:</strong><ul style="margin:0.25rem 0 0 1rem;font-size:0.85rem;">${items}</ul></div>`;
}

async function iniciarCorreccion(entregaId) {
  // Marcar como procesando de inmediato y refrescar la UI — no esperar la IA
  await supabase.from('entregas').update({ estado: 'procesando' }).eq('id', entregaId);
  await cargarEntregasDocente(document.getElementById('filtro-comision-entregas').value);

  // Llamar a la Edge Function sin bloquear (puede tardar 30-60 seg)
  supabase.functions.invoke('corregir-entrega', { body: { entrega_id: entregaId } })
    .then(({ error }) => {
      if (error) console.error('Error en corrección IA:', error);
      // Refrescar automático cuando termina
      cargarEntregasDocente(document.getElementById('filtro-comision-entregas').value);
    });
}

// Filtro de comisión en entregas
document.addEventListener('DOMContentLoaded', () => {
  const filtroEntregas = document.getElementById('filtro-comision-entregas');
  if (filtroEntregas) filtroEntregas.addEventListener('change', () => cargarEntregasDocente(filtroEntregas.value));
});


document.addEventListener('DOMContentLoaded', iniciarDocente);
