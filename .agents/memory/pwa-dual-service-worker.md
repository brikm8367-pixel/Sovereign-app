---
name: PWA dual service worker conflict
description: Registering a second service worker at the same scope as the vite-plugin-pwa worker causes it to silently replace/fight the caching worker, breaking offline/navigation and appearing as app crashes.
---

Never register more than one service worker for the same scope (e.g. a hand-rolled `/sw-push.js` for push notifications alongside the auto-generated PWA `sw.js`). The browser treats a second `register()` call at an overlapping scope as an update to the same registration slot — whichever worker activates last (each calling `skipWaiting()`/`clients.claim()`) wins and evicts the other, wiping out Workbox precaching/offline routing.

**Why:** Diagnosed as the root cause of a production report of "PWA not responding / closes itself on open" — the custom push SW had no fetch handler and wasn't a static-caching source of the offline app shell, but it was recreated repeated calls (every page mount) taking over an already-installed Workbox SW, so on cold/flaky-network launches, navigation requests had no offline fallback.

**How to apply:** When adding push notifications (or any other SW-based feature) to a PWA that already uses `vite-plugin-pwa`, switch the plugin to the `injectManifest` strategy with a single custom `src/sw.ts` source that imports `workbox-precaching`/`workbox-routing` for caching AND adds the `push`/`notificationclick` listeners in the same file. Client code should call `navigator.serviceWorker.ready` to get the one active registration rather than calling `register()` again.
