// Maestring Service Worker
// Strategy:
//   - Static assets (_next/static, icons, fonts) → cache-first (long-lived)
//   - App shell pages (/, /login, /pricing, /dashboard) → stale-while-revalidate
//   - API routes (/api/*) → network-only (never cache)
//   - Everything else → network-first, fall back to cache

const CACHE_VERSION = 'v1'
const STATIC_CACHE = `static-${CACHE_VERSION}`
const SHELL_CACHE = `shell-${CACHE_VERSION}`
const KNOWN_CACHES = [STATIC_CACHE, SHELL_CACHE]

// Pages to precache on install — the offline shell.
const SHELL_URLS = [
  '/',
  '/login',
  '/pricing',
  '/offline',
]

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS.map(url => new Request(url, { credentials: 'same-origin' }))))
      .catch(() => {
        // Shell precache failure must not prevent SW activation — user may be
        // offline during SW install (add-to-homescreen, cached page reload).
        // The fetch handler will fill the cache on first successful network hit.
      })
      .then(() => self.skipWaiting())
  )
})

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !KNOWN_CACHES.includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin requests.
  if (url.origin !== self.location.origin) return

  // API routes: network-only — never serve stale auth/data.
  if (url.pathname.startsWith('/api/')) {
    return // browser handles natively
  }

  // Next.js static chunks (_next/static): cache-first.
  // These are content-hashed — a new deploy gets new URLs, old ones expire.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/_next/image/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // Static public assets (icons, fonts, manifest).
  if (/\.(png|ico|svg|jpg|jpeg|webp|woff2?|webmanifest)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // Navigation requests (HTML pages): network-first, stale fallback.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithFallback(request))
    return
  }

  // Default: network-first.
  event.respondWith(networkFirst(request, SHELL_CACHE))
})

// ── Strategies ────────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached ?? new Response('Offline', { status: 503 })
  }
}

async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    // Try the exact URL first, then the offline page.
    const cached = await caches.match(request)
    if (cached) return cached
    const offline = await caches.match('/offline')
    return offline ?? new Response('You are offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
  }
}
