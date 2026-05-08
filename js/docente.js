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

  // Realtime: cuando una entrega cambia de estado (corrección automática), refrescar la tab si está activa
  supabase.channel('entrega-updates')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'entregas' }, () => {
      if (document.getElementById('tab-entregas')?.classList.contains('activo')) {
        cargarEntregasDocente(document.getElementById('filtro-comision-entregas').value);
      }
    })
    .subscribe();
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
      if (btn.dataset.tab === 'tab-actividades') cargarTabActividades();
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
  const opcionesTodas = {
    'filtro-comision': 'Todas',
    'filtro-comision-entregas': 'Todas',
    'sel-comision-actividad': 'Todas las comisiones',
  };
  Object.entries(opcionesTodas).forEach(([id, label]) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = `<option value="">${label}</option>`;
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
      <td style="text-align:center;">
        <input type="checkbox" class="toggle-ianes" data-id="${alumno.id}" ${alumno.autocorreccion_ia ? 'checked' : ''}
          title="Habilitar autocorrección iaNes para este alumno"
          style="width:1.1rem;height:1.1rem;cursor:pointer;" />
      </td>
    `;
    tr.querySelector('.toggle-ianes').addEventListener('change', async (e) => {
      e.stopPropagation();
      const cb = e.target;
      cb.disabled = true;
      const { error } = await supabase.from('usuarios').update({ autocorreccion_ia: cb.checked }).eq('id', alumno.id);
      cb.disabled = false;
      if (error) { cb.checked = !cb.checked; alert('No se pudo actualizar.'); }
    });
    tr.addEventListener('click', (e) => {
      if (e.target.classList.contains('toggle-ianes')) return;
      mostrarDetalleAlumno(alumno);
    });
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

  const { data: corrData } = await supabase
    .from('correcciones')
    .select('*, comentarios_correccion(*)')
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

  card.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.5rem;">
      <div>
        <strong>${alumno?.nombre || '—'}</strong>
        <span style="color:var(--texto-suave);font-size:0.85rem;margin-left:0.5rem;">${comisionNombre}</span>
        <span style="color:var(--texto-suave);font-size:0.8rem;margin-left:0.5rem;">${fecha}</span>
      </div>
      <div style="display:flex;align-items:center;gap:0.4rem;flex-shrink:0;">
        ${estadoBadge}
        <button class="btn-min-card" style="background:none;border:1px solid var(--borde);border-radius:4px;cursor:pointer;font-size:0.7rem;padding:0.2rem 0.45rem;color:var(--texto-suave);" title="Minimizar">▲</button>
        <button class="btn-del-card" style="background:none;border:1px solid #fca5a5;border-radius:4px;cursor:pointer;font-size:0.7rem;padding:0.2rem 0.45rem;color:#991b1b;" title="Eliminar">✕</button>
      </div>
    </div>
    <div class="card-cuerpo-entrega">
      <p style="font-weight:600;margin-bottom:0.5rem;">${entrega.titulo}</p>
      ${entrega.descripcion ? `<p style="font-size:0.875rem;color:var(--texto-suave);margin-bottom:0.75rem;">${entrega.descripcion}</p>` : ''}
      <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;">${imagenesHTML}</div>
      ${entrega.estado === 'pendiente' ? `<button class="btn-primario btn-corregir" data-id="${entrega.id}" style="width:auto;">Corregir con IA</button>` : ''}
      ${renderCorreccionDocente(correccion)}
    </div>
  `;

  const cuerpo = card.querySelector('.card-cuerpo-entrega');
  const btnMin = card.querySelector('.btn-min-card');
  btnMin.addEventListener('click', () => {
    const cerrado = cuerpo.hidden;
    cuerpo.hidden = !cerrado;
    btnMin.textContent = cerrado ? '▲' : '▼';
  });

  card.querySelector('.btn-del-card').addEventListener('click', async () => {
    if (!confirm(`¿Eliminar la entrega de ${alumno?.nombre || 'este alumno'}? No se puede deshacer.`)) return;
    await supabase.from('correcciones').delete().eq('entrega_id', entrega.id);
    const { error } = await supabase.from('entregas').delete().eq('id', entrega.id);
    if (error) { alert('No se pudo eliminar.'); return; }
    card.remove();
  });

  card.querySelector('.btn-corregir')?.addEventListener('click', (e) => {
    const btn = e.currentTarget;
    mostrarModalCorreccion(entrega.titulo, async ({ enunciado, respuestas }) => {
      btn.disabled = true;
      btn.textContent = 'Enviando…';
      await iniciarCorreccion(entrega.id, enunciado, respuestas);
    });
  });

  return card;
}

function renderFeedback(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>')
    .replace(/_\{([^}]+)\}/g, '<sub>$1</sub>')
    .replace(/([a-zA-Zα-ωΑ-Ω0-9])\^([0-9a-zA-Z])/g, '$1<sup>$2</sup>')
    .replace(/([a-zA-Zα-ωΑ-Ω0-9])_([0-9a-zA-Z,]+)/g, '$1<sub>$2</sub>');
}

function renderInterpretacion(texto) {
  if (!texto) return '';
  return `
    <div style="margin-bottom:0.75rem;padding:0.75rem;background:#f0f9ff;border-radius:6px;border:1px solid #bae6fd;">
      <div style="font-size:0.72rem;font-weight:600;color:#0369a1;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.35rem;">Como interpretó el enunciado</div>
      <div style="font-size:0.875rem;color:#0c4a6e;">${renderFeedback(texto)}</div>
    </div>`;
}

function renderCorreccionDocente(correccion) {
  if (!correccion) return '';
  const problemas = correccion.problemas?.length ? correccion.problemas : null;

  let cuerpoHTML = '';
  if (problemas) {
    cuerpoHTML = problemas.map((p, i) => `
      <div${i > 0 ? ' style="margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid var(--borde);"' : ''}>
        <div style="font-weight:600;color:var(--primario);margin-bottom:0.75rem;">
          Problema ${p.numero || (i + 1)}${p.titulo ? ' — ' + p.titulo : ''}
        </div>
        ${renderInterpretacion(p.interpretacion_enunciado)}
        ${renderDimension('Planteamiento', p.planteamiento_puntaje, p.planteamiento_feedback)}
        <div style="height:0.5rem;"></div>
        ${renderDimension('Procedimiento', p.procedimiento_puntaje, p.procedimiento_feedback)}
        <div style="height:0.5rem;"></div>
        ${renderDimension('Resultado', p.resultado_puntaje, p.resultado_feedback)}
        ${p.comentario ? `<p style="font-size:0.875rem;margin-top:0.75rem;"><strong>Comentario:</strong> ${renderFeedback(p.comentario)}</p>` : ''}
      </div>
    `).join('');
  } else {
    cuerpoHTML = `
      ${renderInterpretacion(correccion.interpretacion_enunciado)}
      ${renderDimension('Planteamiento', correccion.planteamiento_puntaje, correccion.planteamiento_feedback)}
      <div style="height:0.5rem;"></div>
      ${renderDimension('Procedimiento', correccion.procedimiento_puntaje, correccion.procedimiento_feedback)}
      <div style="height:0.5rem;"></div>
      ${renderDimension('Resultado', correccion.resultado_puntaje, correccion.resultado_feedback)}
    `;
  }

  const comentarioFinal = correccion.comentario_general
    ? `<p style="font-size:0.875rem;margin-top:0.75rem;${problemas ? 'padding-top:0.75rem;border-top:1px solid var(--borde);' : ''}"><strong>Comentario general:</strong> ${renderFeedback(correccion.comentario_general)}</p>`
    : '';

  return `
    <div style="margin-top:1rem;padding:1rem;background:var(--fondo);border-radius:8px;border-left:4px solid var(--primario);">
      <h4 style="margin-bottom:0.75rem;">Corrección IA</h4>
      ${cuerpoHTML}
      ${comentarioFinal}
      ${renderVideosDocente(correccion.videos_sugeridos)}
      ${renderComentariosDocente(correccion.comentarios_correccion)}
    </div>`;
}

function renderComentariosDocente(comentarios) {
  if (!comentarios?.length) return '';
  const items = [...comentarios]
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map(c => `
      <div style="padding:0.5rem 0.6rem;background:var(--blanco);border-radius:6px;border:1px solid var(--borde);">
        <div style="font-size:0.72rem;color:var(--texto-suave);margin-bottom:0.2rem;">
          ${new Date(c.created_at).toLocaleDateString('es-AR', {day:'2-digit',month:'2-digit',year:'numeric'})}
        </div>
        <div style="font-size:0.875rem;">${c.texto}</div>
      </div>`).join('');
  return `
    <div style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--borde);">
      <div style="font-size:0.75rem;font-weight:600;color:var(--texto-suave);margin-bottom:0.4rem;">💬 Comentarios del alumno</div>
      <div style="display:flex;flex-direction:column;gap:0.35rem;">${items}</div>
    </div>`;
}

function renderDimension(label, puntaje, feedback) {
  const color = puntaje >= 7 ? '#065f46' : puntaje >= 4 ? '#92400e' : '#991b1b';
  const bg    = puntaje >= 7 ? '#d1fae5' : puntaje >= 4 ? '#fef3c7' : '#fee2e2';
  return `
    <div style="background:${bg};padding:0.75rem;border-radius:6px;">
      <div style="font-weight:600;color:${color};margin-bottom:0.25rem;">${label}: ${puntaje ?? '—'}/10</div>
      <div style="font-size:0.85rem;">${renderFeedback(feedback) || ''}</div>
    </div>`;
}

function renderVideosDocente(videos) {
  if (!videos?.length) return '';
  const items = videos.map(v =>
    `<li><a href="${v.url}" target="_blank" style="color:var(--primario);">${v.titulo}</a></li>`
  ).join('');
  return `<div style="margin-top:0.5rem;"><strong style="font-size:0.9rem;">Videos sugeridos:</strong><ul style="margin:0.25rem 0 0 1rem;font-size:0.85rem;">${items}</ul></div>`;
}

function mostrarModalCorreccion(tituloEntrega, onConfirmar) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem;';
  overlay.innerHTML = `
    <div style="background:var(--blanco);border-radius:12px;padding:1.5rem;width:100%;max-width:520px;box-shadow:0 8px 32px rgba(0,0,0,0.18);">
      <h3 style="margin-bottom:0.25rem;">Corregir con IA</h3>
      <p style="font-size:0.875rem;color:var(--texto-suave);margin-bottom:1.25rem;">${tituloEntrega}</p>
      <div class="campo">
        <label>Enunciado del/los problema/s <span style="font-weight:400;color:var(--texto-suave);">(opcional)</span></label>
        <textarea id="modal-enunciado" rows="4" placeholder="Pegá el enunciado completo para que la IA lo use como referencia y no interprete mal el problema." style="resize:vertical;"></textarea>
      </div>
      <div class="campo">
        <label>Respuestas correctas <span style="font-weight:400;color:var(--texto-suave);">(opcional)</span></label>
        <textarea id="modal-respuestas" rows="2" placeholder="Ej: Problema 1: v = 3 m/s  |  Problema 2: F = 50 N" style="resize:vertical;"></textarea>
      </div>
      <div style="display:flex;gap:0.5rem;justify-content:flex-end;margin-top:1rem;">
        <button class="btn-secundario btn-cancelar-modal" style="width:auto;">Cancelar</button>
        <button class="btn-primario btn-ok-modal" style="width:auto;">Corregir</button>
      </div>
    </div>
  `;
  overlay.querySelector('.btn-cancelar-modal').addEventListener('click', () => overlay.remove());
  overlay.querySelector('.btn-ok-modal').addEventListener('click', () => {
    const enunciado = overlay.querySelector('#modal-enunciado').value.trim();
    const respuestas = overlay.querySelector('#modal-respuestas').value.trim();
    overlay.remove();
    onConfirmar({ enunciado: enunciado || null, respuestas: respuestas || null });
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  overlay.querySelector('#modal-enunciado').focus();
}

async function iniciarCorreccion(entregaId, enunciado = null, respuestas = null) {
  await supabase.from('entregas').update({ estado: 'procesando' }).eq('id', entregaId);
  await cargarEntregasDocente(document.getElementById('filtro-comision-entregas').value);

  const body = { entrega_id: entregaId };
  if (enunciado) body.enunciado = enunciado;
  if (respuestas) body.respuestas = respuestas;

  supabase.functions.invoke('corregir-entrega', { body })
    .then(({ error }) => {
      if (error) console.error('Error en corrección IA:', error);
      cargarEntregasDocente(document.getElementById('filtro-comision-entregas').value);
    });
}

// Filtro de comisión en entregas
document.addEventListener('DOMContentLoaded', () => {
  const filtroEntregas = document.getElementById('filtro-comision-entregas');
  if (filtroEntregas) filtroEntregas.addEventListener('change', () => cargarEntregasDocente(filtroEntregas.value));
});


// =============================================
// TAB 6 — ACTIVIDADES
// =============================================

function configurarFormularioActividad() {
  const form = document.getElementById('form-actividad');
  const textareaEnunciado = document.getElementById('act-enunciado');
  const preview = document.getElementById('preview-act-enunciado');

  let timerPreview;
  textareaEnunciado.addEventListener('input', () => {
    clearTimeout(timerPreview);
    timerPreview = setTimeout(async () => {
      preview.innerHTML = textareaEnunciado.value;
      await MathJax.typesetPromise([preview]);
    }, 600);
  });

  // Transcribir imagen de enunciado con IA
  document.getElementById('btn-transcribir-enunciado').addEventListener('click', async () => {
    const input = document.getElementById('act-img-enunciado');
    const status = document.getElementById('transcribir-status');
    const btn = document.getElementById('btn-transcribir-enunciado');

    if (!input.files?.[0]) { alert('Seleccioná una imagen del enunciado primero.'); return; }

    const archivo = input.files[0];
    btn.disabled = true;
    status.style.display = 'inline';
    status.textContent = 'Procesando…';

    try {
      const buffer = await archivo.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const base64 = btoa(bytes.reduce((s, b) => s + String.fromCharCode(b), ''));
      const mime = archivo.type || 'image/jpeg';

      const { data, error } = await supabase.functions.invoke('transcribir-enunciado', {
        body: { imagen_base64: base64, mime_type: mime },
      });

      if (error || !data?.enunciado) throw new Error(error?.message || 'Sin respuesta');

      textareaEnunciado.value = data.enunciado;
      // Disparar preview MathJax
      preview.innerHTML = data.enunciado;
      await MathJax.typesetPromise([preview]);
      status.textContent = '✓ Transcripto';
      setTimeout(() => { status.style.display = 'none'; }, 2000);
    } catch (err) {
      status.textContent = 'Error: ' + err.message;
    } finally {
      btn.disabled = false;
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const titulo = document.getElementById('act-titulo').value.trim();
    const enunciado = textareaEnunciado.value.trim();
    const comisionId = document.getElementById('sel-comision-actividad').value || null;
    const unidadId = document.getElementById('sel-unidad-actividad').value || null;
    if (!titulo || !enunciado) return;

    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    const { error } = await supabase.from('actividades').insert({
      titulo,
      enunciado,
      comision_id: comisionId,
      unidad_id: unidadId,
      created_by: perfilDocente.id,
    });
    btn.disabled = false;

    if (!error) {
      form.reset();
      preview.innerHTML = '';
      cargarTabActividades();
    } else {
      alert('No se pudo crear la actividad.');
    }
  });
}

async function cargarTabActividades() {
  const contenedor = document.getElementById('lista-actividades-docente');
  contenedor.innerHTML = '<p class="cargando">Cargando actividades…</p>';

  // Configurar el formulario de creación la primera vez
  if (!document.getElementById('form-actividad').dataset.configurado) {
    document.getElementById('form-actividad').dataset.configurado = '1';
    configurarFormularioActividad();
  }

  const { data, error } = await supabase
    .from('actividades')
    .select('*, comisiones(nombre, turno), unidades(nombre, orden)')
    .order('created_at', { ascending: false });

  if (error || !data?.length) {
    contenedor.innerHTML = '<p class="sin-datos">No hay actividades creadas aún.</p>';
    return;
  }

  contenedor.innerHTML = '';
  for (const actividad of data) {
    contenedor.appendChild(await crearCardActividad(actividad));
  }
}

async function crearCardActividad(actividad) {
  const estadoBadge = {
    borrador:  '<span class="badge" style="background:#fef3c7;color:#92400e;">Borrador</span>',
    publicada: '<span class="badge" style="background:#d1fae5;color:#065f46;">Publicada ✓</span>',
    cerrada:   '<span class="badge" style="background:#e5e7eb;color:#6b7280;">Cerrada</span>',
  }[actividad.estado] || actividad.estado;

  const comisionLabel = actividad.comisiones
    ? `${actividad.comisiones.nombre}${actividad.comisiones.turno ? ' — ' + actividad.comisiones.turno : ''}`
    : 'Todas las comisiones';

  // Contar entregas vinculadas
  const { count: cantEntregas } = await supabase
    .from('entregas')
    .select('*', { count: 'exact', head: true })
    .eq('actividad_id', actividad.id);

  const card = document.createElement('div');
  card.style.cssText = 'background:var(--blanco);border-radius:8px;box-shadow:var(--sombra);padding:1.25rem;margin-bottom:1.25rem;';

  const puedeEditarSolucion = actividad.estado !== 'cerrada';

  card.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;">
      <div>
        <strong style="font-size:1rem;">${actividad.titulo}</strong>
        <span style="color:var(--texto-suave);font-size:0.82rem;margin-left:0.5rem;">${comisionLabel}</span>
      </div>
      <div style="display:flex;align-items:center;gap:0.4rem;flex-shrink:0;">
        ${estadoBadge}
        <span style="font-size:0.78rem;color:var(--texto-suave);">${cantEntregas ?? 0} entregas</span>
        <button class="btn-min-act" style="background:none;border:1px solid var(--borde);border-radius:4px;cursor:pointer;font-size:0.7rem;padding:0.2rem 0.45rem;color:var(--texto-suave);" title="Minimizar">▲</button>
        <button class="btn-del-act" style="background:none;border:1px solid #fca5a5;border-radius:4px;cursor:pointer;font-size:0.7rem;padding:0.2rem 0.45rem;color:#991b1b;" title="Eliminar">✕</button>
      </div>
    </div>

    <div class="cuerpo-act">
      <!-- Enunciado -->
      <div style="margin-bottom:1rem;">
        <div style="font-size:0.75rem;font-weight:600;color:var(--texto-suave);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.4rem;">Enunciado</div>
        <div class="enunciado-act preview-mathjax" style="font-size:0.9rem;padding:0.75rem;background:var(--fondo);border-radius:6px;">${actividad.enunciado}</div>
      </div>

      <!-- Resolución de referencia -->
      <div style="margin-bottom:1rem;">
        <div style="font-size:0.75rem;font-weight:600;color:var(--texto-suave);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.4rem;">Resolución de referencia</div>

        ${puedeEditarSolucion ? `
          <textarea class="txt-resolucion" rows="6"
            placeholder="Escribí la resolución completa paso a paso. La IA la usará para corregir las entregas de los alumnos."
            style="width:100%;resize:vertical;font-size:0.875rem;padding:0.6rem;border:1px solid var(--borde);border-radius:6px;box-sizing:border-box;"
          >${actividad.resolucion_borrador || ''}</textarea>
          <div class="preview-resolucion preview-mathjax" style="font-size:0.875rem;padding:0.75rem;background:var(--fondo);border-radius:6px;margin-top:0.5rem;${actividad.resolucion_borrador ? '' : 'display:none;'}"></div>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.6rem;">
            <button class="btn-secundario btn-guardar-borrador" style="width:auto;font-size:0.875rem;">Guardar borrador</button>
            <button class="btn-secundario btn-verificar-ia" style="width:auto;font-size:0.875rem;">🤖 Verificar con IA</button>
            ${actividad.estado === 'borrador' || actividad.estado === 'publicada' ? `
              <button class="btn-primario btn-aprobar-publicar" style="width:auto;font-size:0.875rem;">
                ${actividad.estado === 'publicada' ? 'Actualizar solución' : 'Aprobar y publicar'}
              </button>` : ''}
            ${actividad.estado === 'publicada' ? `
              <button class="btn-peligro btn-cerrar-act" style="width:auto;font-size:0.875rem;background:none;border:1px solid #fca5a5;color:#991b1b;padding:0.3rem 0.75rem;border-radius:6px;cursor:pointer;">Cerrar actividad</button>` : ''}
          </div>
          <div class="feedback-ia-act" style="display:none;margin-top:0.75rem;padding:0.75rem;background:#f0fdf4;border:1px solid #86efac;border-radius:6px;font-size:0.875rem;"></div>
        ` : `
          <div style="padding:0.75rem;background:var(--fondo);border-radius:6px;font-size:0.875rem;">${actividad.resolucion_correcta || '<em style="color:var(--texto-suave);">Sin resolución cargada.</em>'}</div>
        `}

        ${actividad.aprobada && actividad.resolucion_correcta ? `
          <div style="margin-top:0.5rem;font-size:0.78rem;color:#065f46;font-weight:600;">✓ Solución aprobada</div>
        ` : ''}
      </div>

      ${actividad.estado === 'publicada' ? `
        <div style="padding:0.5rem 0.75rem;background:#eff6ff;border-radius:6px;font-size:0.82rem;color:#1e40af;">
          📢 Publicada — los alumnos de <strong>${comisionLabel}</strong> pueden ver el enunciado y enviar su resolución.
        </div>` : ''}
    </div>
  `;

  // Render MathJax en el enunciado
  const enunciadoEl = card.querySelector('.enunciado-act');
  requestAnimationFrame(async () => {
    await MathJax.typesetPromise([enunciadoEl]);
  });

  // Minimize/expand
  const cuerpoAct = card.querySelector('.cuerpo-act');
  const btnMin = card.querySelector('.btn-min-act');
  btnMin.addEventListener('click', () => {
    const cerrado = cuerpoAct.hidden;
    cuerpoAct.hidden = !cerrado;
    btnMin.textContent = cerrado ? '▲' : '▼';
  });

  // Eliminar
  card.querySelector('.btn-del-act').addEventListener('click', async () => {
    if (!confirm(`¿Eliminar la actividad "${actividad.titulo}"? Se desvinculan las entregas asociadas.`)) return;
    await supabase.from('actividades').delete().eq('id', actividad.id);
    card.remove();
  });

  if (!puedeEditarSolucion) return card;

  const txtResolucion = card.querySelector('.txt-resolucion');
  const previewResolucion = card.querySelector('.preview-resolucion');
  const feedbackIa = card.querySelector('.feedback-ia-act');

  // Preview en tiempo real de la resolución
  let timerResolucion;
  txtResolucion?.addEventListener('input', () => {
    clearTimeout(timerResolucion);
    timerResolucion = setTimeout(async () => {
      if (txtResolucion.value.trim()) {
        previewResolucion.innerHTML = txtResolucion.value;
        previewResolucion.style.display = '';
        await MathJax.typesetPromise([previewResolucion]);
      } else {
        previewResolucion.style.display = 'none';
      }
    }, 600);
  });

  // Guardar borrador
  card.querySelector('.btn-guardar-borrador')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = 'Guardando…';
    await supabase.from('actividades').update({ resolucion_borrador: txtResolucion.value.trim() }).eq('id', actividad.id);
    btn.disabled = false;
    btn.textContent = 'Guardar borrador';
    btn.style.color = '#065f46';
    setTimeout(() => { btn.style.color = ''; }, 1500);
  });

  // Verificar con IA
  card.querySelector('.btn-verificar-ia')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const resolucion = txtResolucion.value.trim();
    if (!resolucion) { alert('Escribí la resolución antes de verificar.'); return; }
    btn.disabled = true;
    btn.textContent = '⏳ Verificando…';
    feedbackIa.style.display = 'none';

    const { data, error } = await supabase.functions.invoke('revisar-solucion', {
      body: { enunciado: actividad.enunciado, resolucion },
    });

    btn.disabled = false;
    btn.textContent = '🤖 Verificar con IA';

    if (error || !data?.feedback) {
      feedbackIa.style.display = '';
      feedbackIa.style.background = '#fef2f2';
      feedbackIa.style.borderColor = '#fca5a5';
      feedbackIa.textContent = 'Error al verificar. Intentá de nuevo.';
      return;
    }

    feedbackIa.style.display = '';
    feedbackIa.style.background = '#f0fdf4';
    feedbackIa.style.borderColor = '#86efac';
    feedbackIa.innerHTML = renderFeedback(data.feedback.replace(/\n/g, '<br>'));
  });

  // Aprobar y publicar (o actualizar solución publicada)
  card.querySelector('.btn-aprobar-publicar')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const resolucion = txtResolucion.value.trim();
    if (!resolucion) { alert('Escribí la resolución de referencia antes de publicar.'); return; }
    if (!confirm('¿Aprobar esta resolución y publicar la actividad? Los alumnos podrán verla.')) return;
    btn.disabled = true;
    btn.textContent = 'Publicando…';
    await supabase.from('actividades').update({
      resolucion_borrador: resolucion,
      resolucion_correcta: resolucion,
      aprobada: true,
      estado: 'publicada',
    }).eq('id', actividad.id);
    cargarTabActividades();
  });

  // Cerrar actividad
  card.querySelector('.btn-cerrar-act')?.addEventListener('click', async () => {
    if (!confirm('¿Cerrar esta actividad? Los alumnos dejarán de verla.')) return;
    await supabase.from('actividades').update({ estado: 'cerrada' }).eq('id', actividad.id);
    cargarTabActividades();
  });

  return card;
}

document.addEventListener('DOMContentLoaded', iniciarDocente);
