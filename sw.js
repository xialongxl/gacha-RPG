// Service Worker - 动态缓存版本
// Network First 策略，自动缓存所有访问的资源

const CACHE_NAME = 'arknights-pwa-v2';

// 安装事件
self.addEventListener('install', (event) => {
  console.log('Service Worker 安装成功');
  self.skipWaiting();
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('Service Worker 激活中...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker 已激活');
      return self.clients.claim();
    })
  );
});

// 请求拦截 - Network First 策略
self.addEventListener('fetch', (event) => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') {
    return;
  }
  
  // 跳过非同源请求和 chrome-extension 等协议
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    // 先尝试网络请求
    fetch(event.request)
      .then((networkResponse) => {
        // 网络成功，缓存响应副本
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // 网络失败，尝试从缓存获取
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('从缓存获取:', event.request.url);
            return cachedResponse;
          }
          // 缓存也没有，返回离线提示（可选）
          console.log('资源不可用:', event.request.url);
        });
      })
  );
});
