# Física I — UTN FRBA

Aplicación web educativa para la materia Física I de la UTN Facultad Regional Buenos Aires.

## Stack

- HTML5 + CSS3 + JavaScript ES6+ (vanilla, sin frameworks)
- [Supabase](https://supabase.com) — Auth y base de datos PostgreSQL
- PWA (manifest + service worker)
- Deploy en [Vercel](https://vercel.com) vía GitHub

---

## Configuración inicial

### 1. Obtener la Anon Key de Supabase

1. Entrá a [supabase.com](https://supabase.com) e ingresá a tu proyecto.
2. Ir a **Settings → API**.
3. Copiar el valor de **anon public**.
4. Abrir `js/config.js` y reemplazar `PEGAR_ANON_KEY_AQUI` con ese valor.

```js
const SUPABASE_ANON_KEY = 'eyJ...tu_clave_aqui...';
```

> ⚠️ La anon key es pública por diseño (va al cliente), pero nunca expongas la `service_role` key.

### 2. Cargar los datos iniciales

1. En Supabase, ir a **SQL Editor**.
2. Pegar el contenido del archivo `datos-iniciales.sql`.
3. Ejecutar. Esto crea una unidad de Cinemática 1D con teoría, ejercicios y 8 preguntas de quiz.

### 3. Crear usuarios en Supabase Auth

Los estudiantes **no se registran solos**. El docente o administrador debe:

1. Ir a **Authentication → Users → Add user**.
2. Crear el usuario con email y contraseña.
3. Luego insertar manualmente en la tabla `usuarios`:

```sql
INSERT INTO usuarios (id, nombre, email, legajo, rol)
VALUES (
  '<uuid-del-usuario-en-auth>',
  'Apellido, Nombre',
  'email@ejemplo.com',
  '12345',
  'estudiante'  -- o 'docente'
);
```

---

## Deploy en Vercel

1. Subir el repositorio a GitHub.
2. Entrar a [vercel.com](https://vercel.com) y hacer clic en **Add New Project**.
3. Importar el repositorio de GitHub.
4. Vercel detectará automáticamente que es un sitio estático.
5. Hacer clic en **Deploy**. No se necesita configuración adicional.

> El proyecto no tiene build step — todos los archivos se sirven directamente.

---

## Estructura de archivos

```
fisica1-utn/
├── index.html          Login
├── estudiante.html     Panel del estudiante
├── docente.html        Panel del docente
├── quiz.html           Quiz activo
├── resultado.html      Pantalla de resultado
├── css/
│   └── styles.css
├── js/
│   ├── config.js       Credenciales Supabase
│   ├── auth.js         Autenticación y protección de rutas
│   ├── mathjax-init.js Configuración de MathJax
│   ├── estudiante.js
│   ├── docente.js
│   └── quiz.js
├── manifest.json       PWA manifest
├── sw.js               Service worker
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── datos-iniciales.sql Datos de prueba para Supabase
```

---

## Roles

| Rol | Acceso |
|---|---|
| `estudiante` | Panel con unidades, contenido teórico, ejercicios y quiz |
| `docente` | Gestión de contenido, quizzes y visualización de progreso de alumnos |
