// HSSUP Beauty Academy - Service Worker
// 자동 업데이트 + 푸시 알림 통합

const CACHE_VERSION = 'hssup-' + new Date().toISOString().split('T')[0];
const RUNTIME_CACHE = 'hssup-runtime';

// 설치 시 즉시 활성화 대기 안 함
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 활성화 시 옛 캐시 정리 + 즉시 클라이언트 제어
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_VERSION && name !== RUNTIME_CACHE)
            .map((name) => caches.delete(name))
        );
      }),
      self.clients.claim(),
    ])
  );
});

// fetch 전략: HTML/JS/CSS는 network-first (옛 파일 404 방지)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  if (request.method !== 'GET') return;
  
  const url = new URL(request.url);
  
  // 외부 도메인은 캐시 안 함 (Supabase, Toss 등)
  if (url.origin !== self.location.origin) return;
  
  // HTML/JS/CSS는 network-first
  if (
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    request.destination === 'script' ||
    request.destination === 'style'
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }
  
  // 이미지 등은 cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request).then((response) => {
        const responseClone = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, responseClone);
        });
        return response;
      }).catch(() => cached);
    })
  );
});

// 메시지 처리: 즉시 업데이트 적용
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ============================================
// 푸시 알림 처리
// ============================================
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'HSSUP', body: event.data.text() };
  }
  
  const options = {
    body: data.body || '',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    data: { url: data.url || '/' },
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };
  
  event.waitUntil(self.registration.showNotification(data.title || 'HSSUP Academy', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 이미 열린 탭이 있으면 포커스
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      // 없으면 새로 열기
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});