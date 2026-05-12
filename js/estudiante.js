// Lógica del panel del estudiante

/**
 * Comprime una imagen usando Canvas antes de subirla.
 * Reduce fotos de celular (10–20 MB) a ~200–400 KB sin perder legibilidad.
 * @param {File} file - Archivo original
 * @param {number} maxPx - Lado máximo en píxeles (default 1600)
 * @param {number} quality - Calidad JPEG 0–1 (default 0.85)
 * @returns {Promise<Blob>} Blob comprimido
 */
function comprimirImagen(file, maxPx = 1600, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        if (width > height) { height = Math.round(height * maxPx / width); width = maxPx; }
        else                { width = Math.round(width * maxPx / height);  height = maxPx; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob falló')), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo cargar la imagen')); };
    img.src = url;
  });
}

let perfilActual = null;
const _correccionesEst = new Map(); // id → { correccion, titulo, fecha }

function descargarCorreccionEst(id) {
  const ctx = _correccionesEst.get(id);
  if (!ctx) return;
  const { correccion, titulo, fecha } = ctx;
  const nombre = perfilActual?.nombre || '';

  function dimCls(p) { return p >= 7 ? 'ok' : p >= 4 ? 'warn' : 'err'; }
  function dimBg(p)  { return p >= 7 ? 'dim-ok' : p >= 4 ? 'dim-warn' : 'dim-err'; }
  function renderDimP(label, puntaje, feedback) {
    return `<div class="dim ${dimBg(puntaje)}"><div class="dim-lbl ${dimCls(puntaje)}">${label}: ${puntaje ?? '—'}/10</div><div>${renderFeedback(feedback || '')}</div></div>`;
  }

  const problemas = correccion.problemas?.length ? correccion.problemas : null;
  let cuerpoHTML = '';
  if (problemas) {
    cuerpoHTML = problemas.map((p, i) => `
      ${i > 0 ? '<hr class="sep">' : ''}
      <h2>Problema ${p.numero || (i + 1)}${p.titulo ? ' — ' + p.titulo : ''}</h2>
      ${renderDimP('Planteamiento', p.planteamiento_puntaje, p.planteamiento_feedback)}
      ${renderDimP('Procedimiento', p.procedimiento_puntaje, p.procedimiento_feedback)}
      ${renderDimP('Resultado', p.resultado_puntaje, p.resultado_feedback)}
      ${p.comentario ? `<p class="coment"><strong>Comentario:</strong> ${renderFeedback(p.comentario)}</p>` : ''}
    `).join('');
  } else {
    cuerpoHTML = `
      ${renderDimP('Planteamiento', correccion.planteamiento_puntaje, correccion.planteamiento_feedback)}
      ${renderDimP('Procedimiento', correccion.procedimiento_puntaje, correccion.procedimiento_feedback)}
      ${renderDimP('Resultado', correccion.resultado_puntaje, correccion.resultado_feedback)}
    `;
  }

  const videosHTML = correccion.videos_sugeridos?.length
    ? `<div class="videos"><strong>📺 Videos para repasar:</strong><ul>${correccion.videos_sugeridos.map(v => `<li><a href="${v.url}">${v.titulo}</a></li>`).join('')}</ul></div>`
    : '';

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Mi corrección — ${titulo}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Georgia,serif;max-width:750px;margin:2rem auto;padding:1rem;color:#111;line-height:1.65;font-size:15px}
h1{font-size:1.3rem;margin-bottom:.2rem}
.meta{color:#555;font-size:.875rem;margin-bottom:1.25rem;border-bottom:2px solid #003087;padding-bottom:.75rem}
h2{font-size:1.05rem;color:#003087;margin:1.25rem 0 .75rem}
.dim{padding:.65rem .75rem;border-radius:6px;margin-bottom:.45rem}
.dim-ok{background:#d1fae5}.dim-warn{background:#fef3c7}.dim-err{background:#fee2e2}
.dim-lbl{font-weight:700;margin-bottom:.2rem}
.dim-lbl.ok{color:#065f46}.dim-lbl.warn{color:#92400e}.dim-lbl.err{color:#991b1b}
.sep{border:none;border-top:1px solid #ddd;margin:1.25rem 0}
.coment{margin-top:.65rem;font-size:.9rem}
.videos{margin-top:1rem;font-size:.9rem}.videos ul{margin:.25rem 0 0 1.25rem}
a{color:#003087}sup,sub{font-size:.78em}
.btn{display:block;margin:1.5rem auto 0;padding:.5rem 1.5rem;background:#003087;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:.95rem}
@media print{.btn{display:none}}
</style></head><body>
<h1>Mi corrección — Física I UTN FRBA</h1>
<div class="meta"><strong>Prof. Francisco Nesprías</strong><br>Alumno: ${nombre}<br>Entrega: ${titulo}<br>Fecha: ${fecha}</div>
${cuerpoHTML}${videosHTML}
<button class="btn" onclick="window.print()">Imprimir / Guardar PDF</button>
</body></html>`);
  win.document.close();
}

async function iniciarEstudiante() {
  const resultado = await verificarRol('estudiante');
  if (!resultado) return;

  const { perfil } = resultado;
  perfilActual = perfil;

  document.getElementById('nombre-usuario').textContent = perfil.nombre;

  await cargarUnidades();
  await cargarActividades();
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
// SECCIÓN: ACTIVIDADES
// =============================================

async function cargarActividades() {
  const contenedor = document.getElementById('lista-actividades');
  if (!contenedor) return;
  contenedor.innerHTML = '<p class="cargando">Cargando actividades…</p>';

  const { data: actividades, error } = await supabase
    .from('actividades')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !actividades?.length) {
    contenedor.innerHTML = '<p class="sin-datos">No hay actividades publicadas para tu comisión.</p>';
    return;
  }

  // Verificar qué actividades ya fueron entregadas por este alumno
  const { data: misEntregas } = await supabase
    .from('entregas')
    .select('actividad_id, estado')
    .eq('usuario_id', perfilActual.id)
    .not('actividad_id', 'is', null)
    .is('deleted_at', null);

  const entregasPorActividad = {};
  (misEntregas || []).forEach(e => { entregasPorActividad[e.actividad_id] = e.estado; });

  contenedor.innerHTML = '';
  for (const actividad of actividades) {
    contenedor.appendChild(crearCardActividadEstudiante(actividad, entregasPorActividad[actividad.id]));
  }
}

function crearCardActividadEstudiante(actividad, estadoEntrega) {
  const card = document.createElement('div');
  card.style.cssText = 'background:var(--blanco);border-radius:8px;box-shadow:var(--sombra);padding:1.25rem;margin-bottom:1rem;';

  const badgeEntrega = estadoEntrega
    ? ({
        pendiente:  '<span class="badge" style="background:#fef3c7;color:#92400e;">Enviado — pendiente</span>',
        procesando: '<span class="badge" style="background:#dbeafe;color:#1e40af;">Siendo corregido…</span>',
        corregida:  '<span class="badge" style="background:#d1fae5;color:#065f46;">Corregido ✓</span>',
      }[estadoEntrega] || estadoEntrega)
    : '';

  card.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.5rem;">
      <strong style="font-size:1rem;">${actividad.titulo}</strong>
      <div style="display:flex;align-items:center;gap:0.4rem;flex-shrink:0;">
        ${badgeEntrega}
        <button class="btn-toggle-enunciado btn-secundario" style="width:auto;padding:0.25rem 0.75rem;font-size:0.82rem;">Ver enunciado</button>
      </div>
    </div>

    <div class="enunciado-act" hidden style="margin:0.75rem 0;padding:0.75rem;background:var(--fondo);border-radius:6px;font-size:0.9rem;">
      ${actividad.enunciado}
    </div>

    ${!estadoEntrega ? `
      <button class="btn-primario btn-resolver-actividad" style="width:auto;margin-top:0.5rem;font-size:0.875rem;">
        📤 Resolver y enviar
      </button>` : ''}
  `;

  // Toggle enunciado con MathJax
  const enunciadoEl = card.querySelector('.enunciado-act');
  const btnToggle = card.querySelector('.btn-toggle-enunciado');
  let yaRendered = false;
  btnToggle.addEventListener('click', async () => {
    const oculto = enunciadoEl.hidden;
    enunciadoEl.hidden = !oculto;
    btnToggle.textContent = oculto ? 'Ocultar enunciado' : 'Ver enunciado';
    if (oculto && !yaRendered) {
      yaRendered = true;
      await MathJax.typesetPromise([enunciadoEl]);
    }
  });

  // Abrir modal de entrega
  card.querySelector('.btn-resolver-actividad')?.addEventListener('click', () => {
    abrirModalEntregaActividad(actividad, card);
  });

  return card;
}

function abrirModalEntregaActividad(actividad, cardOrigen) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem;overflow-y:auto;';
  overlay.innerHTML = `
    <div style="background:var(--blanco);border-radius:12px;padding:1.5rem;width:100%;max-width:500px;box-shadow:0 8px 32px rgba(0,0,0,0.18);">
      <h3 style="margin-bottom:0.25rem;">Enviar resolución</h3>
      <p style="font-size:0.875rem;color:var(--texto-suave);margin-bottom:1.25rem;">${actividad.titulo}</p>

      <div class="campo">
        <label>Imágenes de tu resolución <span style="color:#991b1b;">*</span></label>
        <input type="file" id="modal-act-imagenes" accept="image/*" multiple required />
        <div id="modal-act-preview" style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.5rem;"></div>
      </div>

      <div class="campo">
        <label>Comentario <span style="font-weight:400;color:var(--texto-suave);">(opcional)</span></label>
        <textarea id="modal-act-comentario" rows="2" placeholder="¿Alguna duda o aclaración sobre tu resolución?"></textarea>
      </div>

      <div id="modal-act-error" class="mensaje-error" hidden></div>

      <div style="display:flex;gap:0.5rem;justify-content:flex-end;margin-top:1rem;">
        <button class="btn-secundario btn-cancelar-act-modal" style="width:auto;">Cancelar</button>
        <button class="btn-primario btn-enviar-act-modal" style="width:auto;">Enviar</button>
      </div>
    </div>
  `;

  const inputImg = overlay.querySelector('#modal-act-imagenes');
  const previewDiv = overlay.querySelector('#modal-act-preview');
  const msgError = overlay.querySelector('#modal-act-error');
  const btnEnviar = overlay.querySelector('.btn-enviar-act-modal');

  inputImg.addEventListener('change', () => {
    previewDiv.innerHTML = '';
    Array.from(inputImg.files).forEach(f => {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(f);
      img.style.cssText = 'width:70px;height:70px;object-fit:cover;border-radius:6px;border:1px solid var(--borde);';
      previewDiv.appendChild(img);
    });
  });

  overlay.querySelector('.btn-cancelar-act-modal').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  btnEnviar.addEventListener('click', async () => {
    const archivos = Array.from(inputImg.files);
    const comentario = overlay.querySelector('#modal-act-comentario').value.trim();
    msgError.hidden = true;

    if (!archivos.length) {
      msgError.textContent = 'Seleccioná al menos una imagen.';
      msgError.hidden = false;
      return;
    }

    btnEnviar.disabled = true;
    btnEnviar.textContent = 'Subiendo…';

    try {
      const urls = [];
      for (const archivo of archivos) {
        const blob = await comprimirImagen(archivo);
        const path = `${perfilActual.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('entregas')
          .upload(path, blob, { contentType: 'image/jpeg' });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('entregas').getPublicUrl(path);
        urls.push(publicUrl);
      }

      btnEnviar.textContent = 'Guardando…';

      const { data: nuevaEntrega, error: insertError } = await supabase.from('entregas').insert({
        usuario_id: perfilActual.id,
        actividad_id: actividad.id,
        titulo: actividad.titulo,
        descripcion: comentario || null,
        imagenes: urls,
        estado: 'pendiente',
      }).select('id').single();

      if (insertError) throw insertError;

      overlay.remove();

      // Auto-corregir con la solución aprobada de la actividad
      if (nuevaEntrega?.id) {
        await supabase.from('entregas').update({ estado: 'procesando' }).eq('id', nuevaEntrega.id);
        supabase.functions.invoke('corregir-entrega', { body: { entrega_id: nuevaEntrega.id } })
          .then(() => cargarMisEntregas());
      }

      // Refrescar secciones
      await cargarActividades();
      await cargarMisEntregas();
    } catch (err) {
      msgError.textContent = 'Error al enviar. Intentá de nuevo.';
      msgError.hidden = false;
      console.error(err);
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar';
    }
  });

  document.body.appendChild(overlay);
  inputImg.focus();
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
        const blob = await comprimirImagen(archivo);
        const path = `${perfilActual.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('entregas')
          .upload(path, blob, { contentType: 'image/jpeg' });

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
    .select('*, correcciones(*, comentarios_correccion(*)), actividades(titulo)')
    .eq('usuario_id', perfilActual.id)
    .is('deleted_at', null)
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
  const actividadBadge = entrega.actividades
    ? `<span class="badge" style="background:#eff6ff;color:#1e40af;font-size:0.75rem;margin-left:0.4rem;">📋 ${entrega.actividades.titulo}</span>`
    : '';

  div.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.5rem;">
      <div><strong>${entrega.titulo}</strong>${actividadBadge}</div>
      <div style="display:flex;align-items:center;gap:0.4rem;flex-shrink:0;">
        <span style="font-size:0.8rem;color:var(--texto-suave);">${fecha}</span>
        <button class="btn-min-card" style="background:none;border:1px solid var(--borde);border-radius:4px;cursor:pointer;font-size:0.7rem;padding:0.2rem 0.45rem;color:var(--texto-suave);" title="Minimizar">▲</button>
        <button class="btn-rehacer-card" style="background:none;border:1px solid #bfdbfe;border-radius:4px;cursor:pointer;font-size:0.7rem;padding:0.2rem 0.45rem;color:#1d4ed8;" title="Rehacer entrega">↩ Rehacer</button>
      </div>
    </div>
    <div class="card-cuerpo-entrega">
      ${estadoBadge}
      ${entrega.descripcion ? `<p style="font-size:0.875rem;color:var(--texto-suave);margin:0.5rem 0;">${entrega.descripcion}</p>` : ''}
      <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.75rem;">${imagenesHTML}</div>
      ${perfilActual.autocorreccion_ia && entrega.estado === 'pendiente' && !entrega.actividad_id ? `
        <button class="btn-primario btn-autocorregir" style="width:auto;margin-top:0.75rem;font-size:0.875rem;">🤖 Corrección automática</button>` : ''}
      ${entrega.actividad_id && entrega.estado === 'pendiente' ? `
        <span style="font-size:0.82rem;color:var(--texto-suave);display:inline-block;margin-top:0.5rem;">⏳ Pendiente de corrección automática…</span>` : ''}
      ${renderCorreccionEstudiante(correccion, entrega.titulo, fecha)}
    </div>
  `;

  const cuerpo = div.querySelector('.card-cuerpo-entrega');
  const btnMin = div.querySelector('.btn-min-card');
  cuerpo.hidden = true;
  btnMin.textContent = '▼';
  let _mathjaxYaRenderizado = false;
  btnMin.addEventListener('click', async () => {
    const cerrado = cuerpo.hidden;
    cuerpo.hidden = !cerrado;
    btnMin.textContent = cerrado ? '▲' : '▼';
    if (cerrado && !_mathjaxYaRenderizado) {
      _mathjaxYaRenderizado = true;
      await MathJax.typesetPromise([cuerpo]);
    }
  });

  div.querySelector('.btn-autocorregir')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = '⏳ Procesando…';
    await supabase.from('entregas').update({ estado: 'procesando' }).eq('id', entrega.id);
    supabase.functions.invoke('corregir-entrega', { body: { entrega_id: entrega.id } })
      .then(() => cargarMisEntregas());
  });

  div.querySelector('.btn-rehacer-card').addEventListener('click', () => {
    if (entrega.actividad_id) {
      const actividad = { id: entrega.actividad_id, titulo: entrega.actividades?.titulo || entrega.titulo };
      abrirModalEntregaActividad(actividad, null);
    } else {
      document.getElementById('entrega-titulo').value = entrega.titulo;
      document.getElementById('entrega-descripcion').value = entrega.descripcion || '';
      document.getElementById('form-entrega').scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.getElementById('entrega-imagenes').focus();
    }
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

function renderCorreccionEstudiante(correccion, titulo, fecha) {
  if (!correccion) return '';
  _correccionesEst.set(correccion.id, { correccion, titulo, fecha });

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

  return `
    <div style="margin-top:1rem;padding:1rem;background:var(--fondo);border-radius:8px;border-left:4px solid var(--primario);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
        <h4 style="margin:0;">Tu corrección</h4>
        <button onclick="descargarCorreccionEst('${correccion.id}')" style="background:none;border:1px solid var(--borde);border-radius:6px;padding:0.25rem 0.6rem;cursor:pointer;font-size:0.78rem;color:var(--texto-suave);" title="Abrir versión para imprimir o guardar como PDF">🖨 Guardar PDF</button>
      </div>
      ${cuerpoHTML}
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
