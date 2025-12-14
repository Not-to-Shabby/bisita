// ======================
// CONFIG
// ======================

const STATIC_CACHE = 'bisita-static-v1';
const DYNAMIC_CACHE = 'bisita-dynamic-v1';
const API_CACHE = 'bisita-api-v1';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/icons/maskable-512.svg',
];

// ======================
// INSTALL EVENT
// ======================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// ======================
// ACTIVATE EVENT
// ======================

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name !== STATIC_CACHE && 
                   name !== DYNAMIC_CACHE && 
                   name !== API_CACHE;
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  
  // Take control of all pages immediately
  self.clients.claim();
});

// ======================
// FETCH EVENT
// ======================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Handle API requests with stale-while-revalidate
  if (isApiRequest(request)) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE));
    return;
  }
  
  // Handle image requests with cache-first
  if (isImageRequest(request)) {
    event.respondWith(cacheFirst(request, DYNAMIC_CACHE));
    return;
  }
  
  // Handle navigation requests (HTML) with network-first
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, STATIC_CACHE));
    return;
  }
  
  // Handle other static assets with cache-first
  event.respondWith(cacheFirst(request, STATIC_CACHE));
});

// ======================
// CACHING STRATEGIES
// ======================

// Cache First: Try cache, fallback to network
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return offline fallback for images
    if (isImageRequest(request)) {
      return createOfflineImageResponse();
    }
    throw error;
  }
}

// Network First: Try network, fallback to cache
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/');
      if (offlinePage) {
        return offlinePage;
      }
    }
    
    throw error;
  }
}

// Stale While Revalidate: Return cache immediately, update cache in background
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Fetch fresh data in background
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch((error) => {
      console.log('[SW] Network fetch failed:', error);
      return null;
    });
  
  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Wait for network if no cache
  const networkResponse = await fetchPromise;
  
  if (networkResponse) {
    return networkResponse;
  }
  
  // Return offline JSON response for API
  return createOfflineApiResponse();
}

// ======================
// HELPERS
// ======================

function isApiRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/') && request.method === 'GET';
}

function isImageRequest(request) {
  const url = new URL(request.url);
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'];
  return imageExtensions.some(ext => url.pathname.toLowerCase().endsWith(ext)) ||
         url.hostname.includes('unsplash.com') ||
         url.hostname.includes('picsum.photos') ||
         url.hostname.includes('cloudinary.com');
}

function createOfflineApiResponse() {
  return new Response(
    JSON.stringify({
      error: 'You are offline',
      offline: true,
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

function createOfflineImageResponse() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <rect fill="#f3f4f6" width="400" height="300"/>
      <text fill="#9ca3af" font-family="system-ui" font-size="14" text-anchor="middle" x="200" y="150">
        Offline
      </text>
    </svg>
  `;
  
  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
    },
  });
}

// ======================
// MESSAGE HANDLING
// ======================

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }
});
