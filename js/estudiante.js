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

// Carga y renderiza las clases disponibles como navegación
async function cargarUnidades() {
  const nav = document.getElementById('nav-clases');
  nav.innerHTML = '<p class="cargando">Cargando clases…</p>';

  const { data: unidades, error } = await supabase
    .from('unidades')
    .select('*')
    .eq('activa', true)
    .order('orden');

  if (error || !unidades?.length) {
    nav.innerHTML = '<p class="sin-datos">No hay clases disponibles.</p>';
    return;
  }

  nav.innerHTML = '';

  for (const unidad of unidades) {
    const link = document.createElement('a');
    link.href = `clase.html?unidad_id=${unidad.id}`;
    link.className = 'nav-link';
    link.textContent = unidad.nombre;
    nav.appendChild(link);
  }
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
    .select('*, correcciones(*)')
    .eq('usuario_id', perfilActual.id)
    .order('created_at', { ascending: false });

  if (error || !entregas?.length) {
    contenedor.innerHTML = '<p class="sin-datos">Todavía no enviaste ningún ejercicio.</p>';
    return;
  }

  contenedor.innerHTML = '';
  entregas.forEach(entrega => contenedor.appendChild(crearCardEntregaEstudiante(entrega)));
}

function crearCardEntregaEstudiante(entrega) {
  const correccion = entrega.correcciones?.[0] || null;
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

  let correccionHTML = '';
  if (correccion) {
    correccionHTML = `
      <div style="margin-top:1rem;padding:1rem;background:var(--fondo);border-radius:8px;border-left:4px solid var(--primario);">
        <h4 style="margin-bottom:0.75rem;">Tu corrección</h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:0.75rem;margin-bottom:0.75rem;">
          ${renderDimensionEstudiante('Planteamiento', correccion.planteamiento_puntaje, correccion.planteamiento_feedback)}
          ${renderDimensionEstudiante('Procedimiento', correccion.procedimiento_puntaje, correccion.procedimiento_feedback)}
          ${renderDimensionEstudiante('Resultado',     correccion.resultado_puntaje,     correccion.resultado_feedback)}
        </div>
        ${correccion.comentario_general ? `<p style="font-size:0.9rem;"><strong>Comentario:</strong> ${correccion.comentario_general}</p>` : ''}
        ${renderVideosSugeridos(correccion.videos_sugeridos)}
      </div>`;
  }

  const div = document.createElement('div');
  div.style.cssText = 'background:var(--blanco);border-radius:8px;box-shadow:var(--sombra);padding:1.25rem;margin-bottom:1rem;';
  div.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.5rem;">
      <strong>${entrega.titulo}</strong>
      <span style="font-size:0.8rem;color:var(--texto-suave);">${fecha}</span>
    </div>
    ${estadoBadge}
    ${entrega.descripcion ? `<p style="font-size:0.875rem;color:var(--texto-suave);margin:0.5rem 0;">${entrega.descripcion}</p>` : ''}
    <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.75rem;">${imagenesHTML}</div>
    ${correccionHTML}
  `;
  return div;
}

function renderDimensionEstudiante(label, puntaje, feedback) {
  const color = puntaje >= 7 ? '#065f46' : puntaje >= 4 ? '#92400e' : '#991b1b';
  const bg    = puntaje >= 7 ? '#d1fae5' : puntaje >= 4 ? '#fef3c7' : '#fee2e2';
  return `
    <div style="background:${bg};padding:0.75rem;border-radius:6px;">
      <div style="font-weight:600;color:${color};margin-bottom:0.25rem;">${label}: ${puntaje ?? '—'}/10</div>
      <div style="font-size:0.85rem;">${feedback || ''}</div>
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
