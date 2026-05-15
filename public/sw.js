// HSSUP Service Worker
// PWA 캐싱 + 푸시 알림 처리

const CACHE_NAME = 'hssup-v1';
const RUNTIME_CACHE = 'hssup-runtime-v1';

// 설치 시 캐시할 핵심 파일들
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
];

// 1. Service Worker 설치
self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// 2. Service Worker 활성화 - 옛 캐시 정리
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. 네트워크 요청 처리 (캐시 우선, 실패시 네트워크)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Supabase API와 외부 리소스는 캐시 안 함 (항상 최신 데이터)
  if (url.hostname.includes('supabase.co') || 
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('jsdelivr.net')) {
    return;
  }

  // GET 요청만 캐싱
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then((cached) => {
      // 캐시에 있으면 캐시 반환, 백그라운드에서 업데이트
      const fetchPromise = fetch(request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

// 4. 푸시 알림 수신
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  let data = { title: 'HSSUP', body: '새 알림이 있습니다' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || '새 알림이 있습니다',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
    },
    actions: data.actions || [],
    tag: data.tag || 'hssup-notification',
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'HSSUP', options)
  );
});

// 5. 알림 클릭 시 동작
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 이미 열린 창이 있으면 그 창으로 포커스
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // 없으면 새 창 열기
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});