// Service worker de FitTrack: la app abre sin conexión (los datos ya viven en IndexedDB).
// Plantilla: el build (plugin `offline` en vite.config.ts) rellena la versión y la lista de archivos.
// - Navegaciones: red primero (con conexión, siempre la versión nueva); sin red, el shell guardado.
// - Resto de GET del mismo origen: caché primero (los /assets/ llevan hash: su contenido nunca cambia).
const CACHE = 'fittrack-__VERSION__'
const PRECACHE = __PRECACHE__
// ignoreVary: el servidor responde `Vary: Origin` y los <script crossorigin> envían Origin,
// pero la copia del install se pidió sin él → sin esto, nunca coincide y offline falla.
const MATCH = { cacheName: CACHE, ignoreVary: true }

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)))
  // Sin skipWaiting: una versión nueva espera a que se cierre la app, así una pestaña abierta
  // nunca pierde los archivos de su versión a mitad de uso.
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('fittrack-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    // La SPA sirve el mismo index.html en todas las rutas. El shell "/" de cada caché es el del install
    // de su versión: no se reescribe aquí, o un SW viejo guardaría el HTML nuevo (que apunta a /assets/
    // que su caché no tiene) y offline la app saldría en blanco.
    event.respondWith(fetch(request).catch(() => caches.match('/', MATCH).then((shell) => shell ?? Response.error())))
    return
  }

  event.respondWith(caches.match(request, MATCH).then((hit) => hit ?? fetch(request)))
})
