const CACHE_NAME = "congregacion-pwa-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
  "/static/js/bundle.js", // Asegúrate de ajustar esta ruta según tu build.
  "/static/css/main.css", // Asegúrate de ajustar esta ruta según tu build.
];

// Instalación del service worker y almacenamiento en caché de los recursos estáticos
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  console.log("Service Worker instalado y recursos en caché.");
});

// Activación del service worker
self.addEventListener("activate", (event) => {
  console.log("Service Worker activado.");
  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Intercepta solicitudes de red y sirve desde la caché
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response; // Retorna la respuesta desde caché si existe
      }
      return fetch(event.request); // Realiza una solicitud de red si no está en caché
    })
  );
});
