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

document.addEventListener('DOMContentLoaded', iniciarEstudiante);
