// Lógica de la página de clase

let perfilActual = null;
let unidadId = null;

async function iniciarClase() {
  const urlParams = new URLSearchParams(window.location.search);
  unidadId = urlParams.get('unidad_id');
  if (!unidadId) {
    alert('ID de unidad no especificado.');
    window.location.href = 'estudiante.html';
    return;
  }

  const resultado = await verificarRol('estudiante');
  if (!resultado) return;

  const { perfil } = resultado;
  perfilActual = perfil;

  document.getElementById('nombre-usuario').textContent = perfil.nombre;

  await cargarClase();
  configurarFormulario();
}

// Carga el título y contenido de la clase
async function cargarClase() {
  // Cargar nombre de la unidad
  const { data: unidad, error: errorUnidad } = await supabase
    .from('unidades')
    .select('nombre, descripcion')
    .eq('id', unidadId)
    .single();

  if (errorUnidad || !unidad) {
    document.getElementById('titulo-clase').textContent = 'Clase no encontrada';
    return;
  }

  document.getElementById('titulo-clase').textContent = unidad.nombre;

  // Cargar teoría
  const contenedorTeoria = document.getElementById('contenido-clase');
  contenedorTeoria.innerHTML = '<p class="cargando">Cargando teoría…</p>';

  const { data: teoria, error: errorTeoria } = await supabase
    .from('contenido')
    .select('*')
    .eq('unidad_id', unidadId)
    .eq('tipo', 'teoria')
    .order('orden');

  if (errorTeoria || !teoria?.length) {
    contenedorTeoria.innerHTML = '<p class="sin-datos">Sin teoría cargada.</p>';
  } else {
    contenedorTeoria.innerHTML = '';
    for (const item of teoria) {
      const div = document.createElement('div');
      div.className = 'contenido-teoria';
      div.innerHTML = `<h4>${item.titulo}</h4><div>${item.cuerpo}</div>`;
      contenedorTeoria.appendChild(div);
      await MathJax.typesetPromise([div]);
    }
  }

  // Cargar ejercicios
  const form = document.getElementById('form-ejercicios');
  form.innerHTML = '<p class="cargando">Cargando ejercicios…</p>';

  const { data: ejercicios, error: errorEjercicios } = await supabase
    .from('contenido')
    .select('*')
    .eq('unidad_id', unidadId)
    .eq('tipo', 'ejercicio')
    .order('orden');

  if (errorEjercicios || !ejercicios?.length) {
    form.innerHTML = '<p class="sin-datos">Sin ejercicios propuestos.</p>';
  } else {
    form.innerHTML = '';
    for (const ejercicio of ejercicios) {
      const div = document.createElement('div');
      div.className = 'ejercicio-item';
      div.innerHTML = `
        <h4>${ejercicio.titulo}</h4>
        <div class="ejercicio-cuerpo">${ejercicio.cuerpo}</div>
        <label>Tu respuesta:</label>
        <input type="text" name="respuesta-${ejercicio.id}" required />
      `;
      form.appendChild(div);
    }
  }
}

// Configura el envío del formulario
function configurarFormulario() {
  const form = document.getElementById('form-ejercicios');
  const btnEnviar = document.getElementById('btn-enviar');
  const resultadoDiv = document.getElementById('resultado-correccion');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btnEnviar.disabled = true;
    resultadoDiv.hidden = true;

    const formData = new FormData(form);
    const respuestas = {};
    for (const [key, value] of formData.entries()) {
      const ejercicioId = key.replace('respuesta-', '');
      respuestas[ejercicioId] = value;
    }

    // Aquí irá la lógica de corrección automática
    // Por ahora, placeholder
    const resultado = await corregirEjercicios(respuestas);

    resultadoDiv.innerHTML = resultado;
    resultadoDiv.hidden = false;
    btnEnviar.disabled = false;
  });
}

// Función placeholder para corrección automática
async function corregirEjercicios(respuestas) {
  // TODO: Implementar lógica de corrección
  // Por ejemplo, comparar con respuestas correctas en DB o calcular numéricamente
  let correctas = 0;
  const total = Object.keys(respuestas).length;

  // Simulación: asumir que respuestas numéricas correctas son pares
  for (const resp of Object.values(respuestas)) {
    if (!isNaN(resp) && parseFloat(resp) % 2 === 0) correctas++;
  }

  return `<p>Respuestas enviadas. Corrección automática: ${correctas}/${total} correctas.</p>`;
}

document.addEventListener('DOMContentLoaded', iniciarClase);