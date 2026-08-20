const STATIC_CACHE = 'ielts-wrong-review-static-v1'
const SHELL_CACHE = 'ielts-wrong-review-shell-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys()
    await Promise.all(names.filter((name) => ![STATIC_CACHE, SHELL_CACHE].includes(name)).map((name) => caches.delete(name)))
    await self.clients.claim()
  })())
})

async function networkFirst(request) {
  try {
    const response = await fetch(request, { cache: 'no-store' })
    if (response && response.ok) {
      const cache = await caches.open(SHELL_CACHE)
      await cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    const cached = await caches.match(request)
    if (cached) return cached
    throw error
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response && response.ok) {
    const cache = await caches.open(STATIC_CACHE)
    await cache.put(request, response.clone())
  }
  return response
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html' || url.pathname.endsWith('/app-version.json') || url.pathname.endsWith('/data/mistakes.json')) {
    event.respondWith(networkFirst(request))
    return
  }

  if (url.pathname.includes('/assets/') || url.pathname.includes('/media/') || url.pathname.includes('/icons/')) {
    event.respondWith(cacheFirst(request))
  }
})
