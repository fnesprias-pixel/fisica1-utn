// Lógica del panel del estudiante

let perfilActual = null;

async function iniciarEstudiante() {
  const resultado = await verificarRol('estudiante');
  if (!resultado) return;

  const { perfil } = resultado;
  perfilActual = perfil;

  document.getElementById('nombre-usuario').textContent = perfil.nombre;

  await cargarUnidades();
  configurarModalContrasena();
}

// Carga y renderiza las unidades activas
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

  // Tomar el último intento por pregunta
  const porPregunta = {};
  for (const p of progresos) {
    porPregunta[p.quiz_id] = p.es_correcto;
  }

  const correctas = Object.values(porPregunta).filter(Boolean).length;
  const total = quizzes.length;
  return { pct: Math.round((correctas / total) * 100), total, correctas };
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

  const progresoTexto = progreso
    ? `${progreso.correctas}/${progreso.total} correctas`
    : 'Sin quiz';

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
      <hr class="separador"/>
      <a href="quiz.html?unidad_id=${unidad.id}" class="btn-primario" style="text-align:center;display:block;">
        Hacer quiz →
      </a>
    </div>
  `;

  const header = card.querySelector('.unidad-header');
  header.addEventListener('click', () => toggleUnidad(card, unidad.id));

  return card;
}

// Abre o cierra una unidad y carga su contenido al abrir por primera vez
async function toggleUnidad(card, unidadId) {
  const yaAbierta = card.classList.contains('abierta');
  card.classList.toggle('abierta');

  if (!yaAbierta) {
    await cargarContenido(unidadId, 'teoria');
    await cargarContenido(unidadId, 'ejercicio');
  }
}

// Carga el contenido (teoría o ejercicio) de una unidad
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
  for (const item of items) {
    contenedor.appendChild(crearItemContenido(item));
  }
}

// Construye el DOM de un ítem de contenido expandible
function crearItemContenido(item) {
  const div = document.createElement('div');
  div.className = 'contenido-item';

  div.innerHTML = `
    <div class="contenido-item-header">
      <span>${item.titulo}</span>
      <span>▼</span>
    </div>
    <div class="contenido-item-cuerpo" data-id="${item.id}">
      ${item.cuerpo}
    </div>
  `;

  const headerEl = div.querySelector('.contenido-item-header');
  const cuerpoEl = div.querySelector('.contenido-item-cuerpo');

  headerEl.addEventListener('click', async () => {
    const yaAbierto = div.classList.contains('abierto');
    div.classList.toggle('abierto');

    if (!yaAbierto) {
      await MathJax.typesetPromise([cuerpoEl]);
      await registrarVista(item.id);
    }
  });

  return div;
}

// Registra la visualización de un contenido
async function registrarVista(contenidoId) {
  await supabase.from('vistas_contenido').insert({
    usuario_id: perfilActual.id,
    contenido_id: contenidoId
  });
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

document.addEventListener('DOMContentLoaded', iniciarEstudiante);
