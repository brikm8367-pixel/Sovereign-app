/// <reference lib="webworker" />
/**
 * Single unified Service Worker for Sovereign.
 *
 * IMPORTANT: this is the ONLY service worker registered for scope "/".
 * It replaces the old dual-SW setup (vite-pwa generated sw.js + a
 * separately-registered /sw-push.js) which caused two workers to fight
 * for control of the same scope — each calling skipWaiting()/clients.claim()
 * on the other, wiping out precached assets and breaking navigation on
 * flaky mobile connections (root cause of "PWA not responding" crashes).
 *
 * Precaching/offline support (Workbox) and push notifications now live
 * together in this single script, injected via vite-plugin-pwa's
 * `injectManifest` strategy.
 */
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

declare let self: ServiceWorkerGlobalScope;

// ---- Precaching (injected by vite-plugin-pwa at build time) ----
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// SPA navigation fallback — serve the app shell for any non-API navigation
// that isn't already precached, so deep links work offline/first-load.
registerRoute(
  ({ request, url }) => {
    if (request.mode !== "navigate") return false;
    if (url.pathname.startsWith("/api")) return false;
    if (url.pathname.startsWith("/supabase")) return false;
    return true;
  },
  new NetworkFirst({
    cacheName: "pages-cache",
    networkTimeoutSeconds: 5,
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  }),
);

registerRoute(
  ({ url }) => url.origin === "https://fonts.googleapis.com",
  new CacheFirst({
    cacheName: "google-fonts-cache",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  }),
);

registerRoute(
  ({ url }) => url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: "gstatic-fonts-cache",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  }),
);

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.skipWaiting();
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ---- Push notifications (merged from the old /sw-push.js) ----
self.addEventListener("push", (event: PushEvent) => {
  let data: any = { title: "Sovereign", body: "New message", icon: "/pwa-192x192.png" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* ignore malformed payloads */
  }

  const actions: { action: string; title: string }[] = [];

  if (data.notificationType === "call_audio" || data.notificationType === "call_video") {
    actions.push({ action: "accept", title: "✅ Accept" }, { action: "reject", title: "❌ Decline" });
  } else if (data.notificationType === "direct_access_added") {
    actions.push({ action: "view", title: "👀 View" });
  } else if (data.notificationType !== "pattern_report") {
    actions.push({ action: "reply", title: "↩️ Reply" }, { action: "like", title: "❤️" });
  }

  const options: NotificationOptions = {
    body: data.body,
    icon: data.icon || "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    tag: data.tag || "directly-notification",
    renotify: true,
    requireInteraction: data.requireInteraction || false,
    vibrate: data.silent ? [] : [200, 100, 200, 100, 200],
    actions,
    data: {
      url: data.url || "/home",
      conversationId: data.conversationId || null,
      callId: data.callId || null,
      notificationType: data.notificationType || "message",
      senderId: data.senderId || null,
    },
  } as NotificationOptions;

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const nd: any = event.notification.data || {};
  let url = nd.url || "/home";

  if (event.action === "reply" && nd.conversationId) {
    url = `/home?tab=inbox&conversation=${nd.conversationId}`;
  } else if (event.action === "like" && nd.conversationId) {
    url = `/home?tab=inbox&conversation=${nd.conversationId}&action=like`;
  } else if (event.action === "accept" && nd.callId) {
    url = `/home?call=${nd.callId}&from=${nd.senderId}`;
  } else if (event.action === "reject") {
    return;
  } else if (event.action === "view") {
    url = `/home?tab=inbox`;
  } else if (nd.conversationId) {
    url = `/home?tab=inbox&conversation=${nd.conversationId}`;
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients as WindowClient[]) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

self.addEventListener("sync", (event: any) => {
  if (event.tag === "directly-send-messages") {
    event.waitUntil(
      self.clients.matchAll({ type: "window" }).then((windowClients) => {
        for (const client of windowClients) {
          client.postMessage({ type: "FLUSH_OFFLINE_QUEUE" });
        }
      }),
    );
  }
});
