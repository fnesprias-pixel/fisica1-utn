// Módulo de autenticación y protección de rutas

// Verifica si hay sesión activa; si no, redirige al login
async function verificarSesion() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = '/index.html';
    return null;
  }
  return session;
}

// Obtiene el perfil del usuario desde la tabla usuarios
async function obtenerPerfil(userId) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error al obtener perfil:', error.message);
    return null;
  }
  return data;
}

// Verifica sesión y rol; redirige si no corresponde
async function verificarRol(rolRequerido) {
  const session = await verificarSesion();
  if (!session) return null;

  const perfil = await obtenerPerfil(session.user.id);
  if (!perfil) {
    await supabase.auth.signOut();
    window.location.href = '/index.html';
    return null;
  }

  if (perfil.rol !== rolRequerido) {
    if (perfil.rol === 'estudiante') {
      window.location.href = '/estudiante.html';
    } else {
      window.location.href = '/docente.html';
    }
    return null;
  }

  return { session, perfil };
}

// Cierra sesión y redirige al login
async function cerrarSesion() {
  await supabase.auth.signOut();
  window.location.href = '/index.html';
}
