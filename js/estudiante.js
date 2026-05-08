// Lógica del panel del estudiante

let perfilActual = null;

async function iniciarEstudiante() {
  const resultado = await verificarRol('estudiante');
  if (!resultado) return;

  const { perfil } = resultado;
  perfilActual = perfil;

  document.getElementById('nombre-usuario').textContent = perfil.nombre;

  await cargarUnidades();
  iniciarSeccionEntregas();
  configurarModalContrasena();
}

// Carga y renderiza las unidades activas como acordeón
async function cargarUnidades() {
  const contenedor = document.getElementById('lista-unidades');
  contenedor.innerHTML = '<p class="cargando">Cargando unidades…</p>';

  const { data: unidades, error } = await supabase
    .from('unidades')
    .select('*')
    .eq('activa', true)
    .order('orden');

  if (error || !unidades?.length) {
    contenedor.innerHTML = '<p class="sin-datos">No hay unidades disponibles.</p>';
    return;
  }

  contenedor.innerHTML = '';

  for (const unidad of unidades) {
    const progreso = await obtenerProgresoUnidad(unidad.id);
    const card = crearCardUnidad(unidad, progreso);
    contenedor.appendChild(card);
  }
}

// Obtiene el porcentaje de respuestas correctas para una unidad
async function obtenerProgresoUnidad(unidadId) {
  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('id')
    .eq('unidad_id', unidadId);

  if (!quizzes?.length) return null;

  const quizIds = quizzes.map(q => q.id);

  const { data: progresos } = await supabase
    .from('progreso')
    .select('quiz_id, es_correcto')
    .eq('usuario_id', perfilActual.id)
    .in('quiz_id', quizIds);

  if (!progresos?.length) return { pct: 0, total: quizzes.length, correctas: 0 };

  const porPregunta = {};
  for (const p of progresos) {
    porPregunta[p.quiz_id] = p.es_correcto;
  }

  const correctas = Object.values(porPregunta).filter(Boolean).length;
  return { pct: Math.round((correctas / quizzes.length) * 100), total: quizzes.length, correctas };
}

// Construye el DOM de una card de unidad
function crearCardUnidad(unidad, progreso) {
  const card = document.createElement('div');
  card.className = 'unidad-card';
  card.dataset.unidadId = unidad.id;

  const progresoHTML = progreso
    ? `<div class="barra-progreso-wrap">
         <div class="barra-progreso">
           <div class="barra-progreso-fill" style="width:${progreso.pct}%"></div>
         </div>
         <span class="progreso-pct">${progreso.pct}%</span>
       </div>`
    : '';

  const progresoTexto = progreso ? `${progreso.correctas}/${progreso.total} correctas` : 'Sin quiz';

  card.innerHTML = `
    <div class="unidad-header">
      <span class="unidad-titulo">${unidad.nombre}</span>
      <span class="unidad-progreso">${progresoTexto}</span>
      <span class="unidad-chevron">▼</span>
    </div>
    <div class="unidad-cuerpo">
      <p class="unidad-descripcion">${unidad.descripcion || ''}</p>
      ${progresoHTML}
      <div class="seccion-titulo">Teoría</div>
      <div class="lista-contenido" id="teoria-${unidad.id}">
        <p class="cargando">Cargando…</p>
      </div>
      <div class="seccion-titulo">Ejercicios resueltos</div>
      <div class="lista-contenido" id="ejercicios-${unidad.id}">
        <p class="cargando">Cargando…</p>
      </div>
    </div>
  `;

  card.querySelector('.unidad-header').addEventListener('click', () => toggleUnidad(card, unidad.id));
  return card;
}

async function toggleUnidad(card, unidadId) {
  const yaAbierta = card.classList.contains('abierta');
  card.classList.toggle('abierta');
  if (!yaAbierta) {
    await cargarContenido(unidadId, 'teoria');
    await cargarContenido(unidadId, 'ejercicio');
  }
}

async function cargarContenido(unidadId, tipo) {
  const contenedor = document.getElementById(
    tipo === 'teoria' ? `teoria-${unidadId}` : `ejercicios-${unidadId}`
  );
  if (contenedor.dataset.cargado) return;
  contenedor.dataset.cargado = '1';

  const { data: items, error } = await supabase
    .from('contenido')
    .select('*')
    .eq('unidad_id', unidadId)
    .eq('tipo', tipo)
    .order('orden');

  if (error || !items?.length) {
    contenedor.innerHTML = '<p class="sin-datos">Sin contenido cargado.</p>';
    return;
  }

  contenedor.innerHTML = '';
  for (const item of items) contenedor.appendChild(crearItemContenido(item));
}

function crearItemContenido(item) {
  const div = document.createElement('div');
  div.className = 'contenido-item';
  div.innerHTML = `
    <div class="contenido-item-header"><span>${item.titulo}</span><span>▼</span></div>
    <div class="contenido-item-cuerpo" data-id="${item.id}">${item.cuerpo}</div>
  `;
  const headerEl = div.querySelector('.contenido-item-header');
  const cuerpoEl = div.querySelector('.contenido-item-cuerpo');
  headerEl.addEventListener('click', async () => {
    const yaAbierto = div.classList.contains('abierto');
    div.classList.toggle('abierto');
    if (!yaAbierto) {
      await MathJax.typesetPromise([cuerpoEl]);
      await supabase.from('vistas_contenido').insert({ usuario_id: perfilActual.id, contenido_id: item.id });
    }
  });
  return div;
}

// Configura el modal de cambio de contraseña
function configurarModalContrasena() {
  const btnCambiar = document.getElementById('btn-cambiar-pass');
  const modal = document.getElementById('modal-contrasena');
  const btnCancelar = document.getElementById('btn-cancelar-pass');
  const btnGuardar = document.getElementById('btn-guardar-pass');
  const msgError = document.getElementById('error-pass');
  const msgExito = document.getElementById('exito-pass');

  btnCambiar.addEventListener('click', () => {
    modal.hidden = false;
    msgError.hidden = true;
    msgExito.hidden = true;
    document.getElementById('nueva-pass').value = '';
    document.getElementById('confirmar-pass').value = '';
  });

  btnCancelar.addEventListener('click', () => { modal.hidden = true; });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.hidden = true;
  });

  btnGuardar.addEventListener('click', async () => {
    const nueva = document.getElementById('nueva-pass').value;
    const confirmar = document.getElementById('confirmar-pass').value;

    msgError.hidden = true;
    msgExito.hidden = true;

    if (nueva.length < 6) {
      msgError.textContent = 'La contraseña debe tener al menos 6 caracteres.';
      msgError.hidden = false;
      return;
    }

    if (nueva !== confirmar) {
      msgError.textContent = 'Las contraseñas no coinciden.';
      msgError.hidden = false;
      return;
    }

    btnGuardar.disabled = true;
    const { error } = await supabase.auth.updateUser({ password: nueva });
    btnGuardar.disabled = false;

    if (error) {
      msgError.textContent = 'No se pudo actualizar la contraseña.';
      msgError.hidden = false;
    } else {
      msgExito.hidden = false;
      setTimeout(() => { modal.hidden = true; }, 1800);
    }
  });
}

// =============================================
// SECCIÓN: MIS ENTREGAS
// =============================================

function iniciarSeccionEntregas() {
  const form = document.getElementById('form-entrega');
  const inputImagenes = document.getElementById('entrega-imagenes');
  const previewImagenes = document.getElementById('preview-imagenes');
  const btnSubir = document.getElementById('btn-subir-entrega');
  const msgError = document.getElementById('error-entrega');

  // Vista previa de imágenes seleccionadas
  inputImagenes.addEventListener('change', () => {
    previewImagenes.innerHTML = '';
    Array.from(inputImagenes.files).forEach(file => {
      const url = URL.createObjectURL(file);
      const img = document.createElement('img');
      img.src = url;
      img.style.cssText = 'width:80px;height:80px;object-fit:cover;border-radius:6px;border:1px solid var(--borde);';
      previewImagenes.appendChild(img);
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msgError.hidden = true;

    const titulo = document.getElementById('entrega-titulo').value.trim();
    const descripcion = document.getElementById('entrega-descripcion').value.trim();
    const archivos = Array.from(inputImagenes.files);

    if (!archivos.length) {
      msgError.textContent = 'Seleccioná al menos una imagen.';
      msgError.hidden = false;
      return;
    }

    btnSubir.disabled = true;
    btnSubir.textContent = 'Subiendo imágenes…';

    try {
      const urls = [];
      for (const archivo of archivos) {
        const ext = archivo.name.split('.').pop();
        const path = `${perfilActual.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('entregas')
          .upload(path, archivo, { contentType: archivo.type });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('entregas')
          .getPublicUrl(path);

        urls.push(publicUrl);
      }

      btnSubir.textContent = 'Guardando entrega…';

      const { error: insertError } = await supabase.from('entregas').insert({
        usuario_id: perfilActual.id,
        titulo,
        descripcion: descripcion || null,
        imagenes: urls,
        estado: 'pendiente'
      });

      if (insertError) throw insertError;

      form.reset();
      previewImagenes.innerHTML = '';
      await cargarMisEntregas();
    } catch (err) {
      msgError.textContent = 'Ocurrió un error al subir la entrega. Intentá de nuevo.';
      msgError.hidden = false;
      console.error(err);
    } finally {
      btnSubir.disabled = false;
      btnSubir.textContent = 'Enviar entrega';
    }
  });

  cargarMisEntregas();
}

async function cargarMisEntregas() {
  const contenedor = document.getElementById('lista-mis-entregas');
  contenedor.innerHTML = '<p class="cargando">Cargando…</p>';

  const { data: entregas, error } = await supabase
    .from('entregas')
    .select('*, correcciones(*, comentarios_correccion(*))')
    .eq('usuario_id', perfilActual.id)
    .order('created_at', { ascending: false });

  if (error || !entregas?.length) {
    contenedor.innerHTML = '<p class="sin-datos">Todavía no enviaste ningún ejercicio.</p>';
    return;
  }

  contenedor.innerHTML = '';
  entregas.forEach(entrega => contenedor.appendChild(crearCardEntregaEstudiante(entrega)));
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

function crearCardEntregaEstudiante(entrega) {
  const correccion = entrega.correcciones?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] ?? null;
  const fecha = new Date(entrega.created_at).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' });

  const estadoBadge = {
    pendiente:  '<span class="badge" style="background:#fef3c7;color:#92400e;">Pendiente revisión</span>',
    procesando: '<span class="badge" style="background:#dbeafe;color:#1e40af;">Siendo corregido…</span>',
    corregida:  '<span class="badge" style="background:#d1fae5;color:#065f46;">Corregido ✓</span>',
  }[entrega.estado] || entrega.estado;

  const imagenesHTML = (entrega.imagenes || []).map(url =>
    `<a href="${url}" target="_blank">
      <img src="${url}" alt="Tu resolución" style="width:90px;height:90px;object-fit:cover;border-radius:6px;border:1px solid var(--borde);" />
    </a>`
  ).join('');

  const div = document.createElement('div');
  div.style.cssText = 'background:var(--blanco);border-radius:8px;box-shadow:var(--sombra);padding:1.25rem;margin-bottom:1rem;';
  div.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.5rem;">
      <strong>${entrega.titulo}</strong>
      <div style="display:flex;align-items:center;gap:0.4rem;flex-shrink:0;">
        <span style="font-size:0.8rem;color:var(--texto-suave);">${fecha}</span>
        <button class="btn-min-card" style="background:none;border:1px solid var(--borde);border-radius:4px;cursor:pointer;font-size:0.7rem;padding:0.2rem 0.45rem;color:var(--texto-suave);" title="Minimizar">▲</button>
        <button class="btn-del-card" style="background:none;border:1px solid #fca5a5;border-radius:4px;cursor:pointer;font-size:0.7rem;padding:0.2rem 0.45rem;color:#991b1b;" title="Eliminar">✕</button>
      </div>
    </div>
    <div class="card-cuerpo-entrega">
      ${estadoBadge}
      ${entrega.descripcion ? `<p style="font-size:0.875rem;color:var(--texto-suave);margin:0.5rem 0;">${entrega.descripcion}</p>` : ''}
      <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.75rem;">${imagenesHTML}</div>
      ${perfilActual.autocorreccion_ia && entrega.estado === 'pendiente' ? `
        <button class="btn-primario btn-autocorregir" style="width:auto;margin-top:0.75rem;font-size:0.875rem;">🤖 Corrección automática</button>` : ''}
      ${renderCorreccionEstudiante(correccion)}
    </div>
  `;

  const cuerpo = div.querySelector('.card-cuerpo-entrega');
  const btnMin = div.querySelector('.btn-min-card');
  btnMin.addEventListener('click', () => {
    const cerrado = cuerpo.hidden;
    cuerpo.hidden = !cerrado;
    btnMin.textContent = cerrado ? '▲' : '▼';
  });

  div.querySelector('.btn-autocorregir')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = '⏳ Procesando…';
    await supabase.from('entregas').update({ estado: 'procesando' }).eq('id', entrega.id);
    supabase.functions.invoke('corregir-entrega', { body: { entrega_id: entrega.id } })
      .then(() => cargarMisEntregas());
  });

  div.querySelector('.btn-del-card').addEventListener('click', async () => {
    if (!confirm('¿Eliminar esta entrega? No se puede deshacer.')) return;
    await supabase.from('correcciones').delete().eq('entrega_id', entrega.id);
    const { error } = await supabase.from('entregas').delete().eq('id', entrega.id).eq('usuario_id', perfilActual.id);
    if (error) { alert('No se pudo eliminar.'); return; }
    div.remove();
  });

  div.querySelector('.btn-enviar-comentario')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const textarea = div.querySelector('.txt-nuevo-comentario');
    const texto = textarea.value.trim();
    if (!texto) return;
    btn.disabled = true;
    const { error } = await supabase.from('comentarios_correccion').insert({
      correccion_id: btn.dataset.correccion,
      usuario_id: perfilActual.id,
      rol: 'estudiante',
      texto
    });
    if (!error) {
      await cargarMisEntregas();
    } else {
      btn.disabled = false;
      alert('No se pudo enviar el comentario.');
    }
  });

  return div;
}

function renderCorreccionEstudiante(correccion) {
  if (!correccion) return '';
  const problemas = correccion.problemas?.length ? correccion.problemas : null;

  let cuerpoHTML = '';
  if (problemas) {
    cuerpoHTML = problemas.map((p, i) => `
      <div${i > 0 ? ' style="margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid var(--borde);"' : ''}>
        <div style="font-weight:600;color:var(--primario);margin-bottom:0.75rem;">
          Problema ${p.numero || (i + 1)}${p.titulo ? ' — ' + p.titulo : ''}
        </div>
        ${renderDimensionEstudiante('Planteamiento', p.planteamiento_puntaje, p.planteamiento_feedback)}
        <div style="height:0.5rem;"></div>
        ${renderDimensionEstudiante('Procedimiento', p.procedimiento_puntaje, p.procedimiento_feedback)}
        <div style="height:0.5rem;"></div>
        ${renderDimensionEstudiante('Resultado', p.resultado_puntaje, p.resultado_feedback)}
        ${p.comentario ? `<p style="font-size:0.875rem;margin-top:0.75rem;"><strong>Comentario:</strong> ${renderFeedback(p.comentario)}</p>` : ''}
      </div>
    `).join('');
  } else {
    cuerpoHTML = `
      ${renderDimensionEstudiante('Planteamiento', correccion.planteamiento_puntaje, correccion.planteamiento_feedback)}
      <div style="height:0.5rem;"></div>
      ${renderDimensionEstudiante('Procedimiento', correccion.procedimiento_puntaje, correccion.procedimiento_feedback)}
      <div style="height:0.5rem;"></div>
      ${renderDimensionEstudiante('Resultado', correccion.resultado_puntaje, correccion.resultado_feedback)}
    `;
  }

  const comentarioFinal = correccion.comentario_general
    ? `<p style="font-size:0.875rem;margin-top:0.75rem;${problemas ? 'padding-top:0.75rem;border-top:1px solid var(--borde);' : ''}"><strong>Comentario:</strong> ${renderFeedback(correccion.comentario_general)}</p>`
    : '';

  return `
    <div style="margin-top:1rem;padding:1rem;background:var(--fondo);border-radius:8px;border-left:4px solid var(--primario);">
      <h4 style="margin-bottom:0.75rem;">Tu corrección</h4>
      ${cuerpoHTML}
      ${comentarioFinal}
      ${renderVideosSugeridos(correccion.videos_sugeridos)}
      <div style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--borde);">
        ${renderListaComentarios(correccion.comentarios_correccion)}
        <textarea class="txt-nuevo-comentario" rows="2"
          placeholder="¿Tenés alguna duda sobre esta corrección? Tu docente puede verlo."
          style="width:100%;resize:vertical;font-size:0.85rem;padding:0.5rem;border:1px solid var(--borde);border-radius:6px;box-sizing:border-box;"></textarea>
        <button class="btn-enviar-comentario btn-secundario"
          data-correccion="${correccion.id}"
          style="width:auto;margin-top:0.35rem;font-size:0.85rem;padding:0.3rem 0.75rem;">
          Enviar comentario
        </button>
      </div>
    </div>`;
}

function renderListaComentarios(comentarios) {
  if (!comentarios?.length) return '';
  return [...comentarios]
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map(c => `
      <div style="padding:0.5rem 0.6rem;background:var(--blanco);border-radius:6px;border:1px solid var(--borde);margin-bottom:0.35rem;">
        <div style="font-size:0.72rem;color:var(--texto-suave);margin-bottom:0.2rem;">
          ${new Date(c.created_at).toLocaleDateString('es-AR', {day:'2-digit',month:'2-digit',year:'numeric'})}
        </div>
        <div style="font-size:0.875rem;">${c.texto}</div>
      </div>`).join('');
}

function renderDimensionEstudiante(label, puntaje, feedback) {
  const color = puntaje >= 7 ? '#065f46' : puntaje >= 4 ? '#92400e' : '#991b1b';
  const bg    = puntaje >= 7 ? '#d1fae5' : puntaje >= 4 ? '#fef3c7' : '#fee2e2';
  return `
    <div style="background:${bg};padding:0.75rem;border-radius:6px;">
      <div style="font-weight:600;color:${color};margin-bottom:0.25rem;">${label}: ${puntaje ?? '—'}/10</div>
      <div style="font-size:0.85rem;">${renderFeedback(feedback) || ''}</div>
    </div>`;
}

function renderVideosSugeridos(videos) {
  if (!videos?.length) return '';
  const items = videos.map(v =>
    `<li><a href="${v.url}" target="_blank" style="color:var(--primario);">${v.titulo}</a></li>`
  ).join('');
  return `
    <div style="margin-top:0.75rem;">
      <strong style="font-size:0.9rem;">📺 Videos para repasar:</strong>
      <ul style="margin:0.25rem 0 0 1rem;font-size:0.85rem;">${items}</ul>
    </div>`;
}

document.addEventListener('DOMContentLoaded', iniciarEstudiante);
