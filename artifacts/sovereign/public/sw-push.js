// Service Worker for Push Notifications — Sovereign
self.addEventListener('push', (event) => {
  let data = { title: 'Sovereign', body: 'New message', icon: '/pwa-192x192.png' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {}

  const actions = [];
  
  // Add context-specific action buttons
  if (data.notificationType === 'call_audio' || data.notificationType === 'call_video') {
    actions.push(
      { action: 'accept', title: '✅ Accept' },
      { action: 'reject', title: '❌ Decline' }
    );
  } else if (data.notificationType === 'direct_access_added') {
    actions.push({ action: 'view', title: '👀 View' });
  } else if (data.notificationType !== 'pattern_report') {
    actions.push(
      { action: 'reply', title: '↩️ Reply' },
      { action: 'like', title: '❤️' }
    );
  }

  const options = {
    body: data.body,
    icon: data.icon || '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: data.tag || 'directly-notification',
    renotify: true,
    requireInteraction: data.requireInteraction || false,
    vibrate: data.silent ? [] : [200, 100, 200, 100, 200],
    actions,
    data: {
      url: data.url || '/home',
      conversationId: data.conversationId || null,
      callId: data.callId || null,
      notificationType: data.notificationType || 'message',
      senderId: data.senderId || null,
    },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const nd = event.notification.data || {};
  let url = nd.url || '/home';

  if (event.action === 'reply' && nd.conversationId) {
    url = `/home?tab=inbox&conversation=${nd.conversationId}`;
  } else if (event.action === 'like' && nd.conversationId) {
    // Like action — open conversation (reaction handled in-app)
    url = `/home?tab=inbox&conversation=${nd.conversationId}&action=like`;
  } else if (event.action === 'accept' && nd.callId) {
    url = `/home?call=${nd.callId}&from=${nd.senderId}`;
  } else if (event.action === 'reject') {
    return; // Just close notification
  } else if (event.action === 'view') {
    url = `/home?tab=inbox`;
  } else if (nd.conversationId) {
    url = `/home?tab=inbox&conversation=${nd.conversationId}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// Offline message queue support
self.addEventListener('sync', (event) => {
  if (event.tag === 'directly-send-messages') {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((windowClients) => {
        for (const client of windowClients) {
          client.postMessage({ type: 'FLUSH_OFFLINE_QUEUE' });
        }
      })
    );
  }
});

// Cache critical assets for offline
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
