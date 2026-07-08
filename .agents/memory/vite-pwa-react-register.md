---
name: vite-plugin-pwa React register hook needs workbox-window
description: Mounting UpdatePrompt / usePwaUpdate (virtual:pwa-register/react) breaks production build unless workbox-window is installed
---

`vite-plugin-pwa`'s React registration hook (`virtual:pwa-register/react`, used by components like `UpdatePrompt`) imports `workbox-window` internally. In dev this resolves fine, but `vite build` fails with:

```
[vite-plugin-pwa:build] Rollup failed to resolve import "workbox-window" from "/@vite-plugin-pwa/virtual:pwa-register/react"
```

**Why:** `workbox-window` is a peer/optional dependency of the plugin, not auto-installed. It's only needed once something in the app actually imports the React registration virtual module.

**How to apply:** Before wiring up any `virtual:pwa-register/react` consumer (e.g. an update-available prompt), add `workbox-window` as a devDependency in the artifact's package.json, then run a full production build to confirm it resolves.
