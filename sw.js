// Service Worker — caché de archivos estáticos
// Los datos de Supabase NO se cachean (siempre van a la red)

const CACHE_NAME = 'fisica1-utn-v1';

const ARCHIVOS_ESTATICOS = [
  '/',
  '/index.html',
  '/estudiante.html',
  '/docente.html',
  '/quiz.html',
  '/resultado.html',
  '/css/styles.css',
  '/js/config.js',
  '/js/auth.js',
  '/js/mathjax-init.js',
  '/js/estudiante.js',
  '/js/docente.js',
  '/js/quiz.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Instalación: pre-cachear archivos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS_ESTATICOS))
  );
  self.skipWaiting();
});

// Activación: eliminar cachés viejos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(
        nombres
          .filter((nombre) => nombre !== CACHE_NAME)
          .map((nombre) => caches.delete(nombre))
      )
    )
  );
  self.clients.claim();
});

// Fetch: red primero para Supabase, caché para estáticos
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Supabase y CDN externos siempre van a la red
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('jsdelivr.net')
  ) {
    return;
  }

  // Para el resto: caché con fallback a red
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
