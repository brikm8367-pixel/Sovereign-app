/**
 * Screenshot Detection — runtime-only, zero external imports.
 * Native plugins (privacy-screen, screenshot) are accessed lazily via
 * window.Capacitor.Plugins when present in a real Capacitor build.
 * Web/PWA path uses a visibility-flicker heuristic.
 */
import { supabase } from '@/integrations/supabase/client';

type Listener = () => void;
const listeners = new Set<Listener>();
let installed = false;

const getCap = (): any => {
  if (typeof window === 'undefined') return null;
  // @ts-ignore
  return (window as any).Capacitor || null;
};

const isNative = (): boolean => !!getCap()?.isNativePlatform?.();

function setupNative() {
  try {
    const cap = getCap();
    const plugins = cap?.Plugins || {};
    // Privacy screen — blocks the OS screenshot preview when available
    if (plugins.PrivacyScreen?.enable) {
      plugins.PrivacyScreen.enable().catch(() => {});
    }
    // Screenshot detection — only iOS/Android with the plugin installed
    if (plugins.Screenshot?.addListener) {
      plugins.Screenshot.addListener('screenshotTaken', () => {
        listeners.forEach((l) => l());
      });
    }
  } catch {
    /* graceful degrade */
  }
}

function setupWeb() {
  // Heuristic: brief visibility flicker (<400ms) ≈ possible screenshot on Android Chrome.
  let hiddenAt = 0;
  const onVis = () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
    } else if (hiddenAt && Date.now() - hiddenAt < 400) {
      hiddenAt = 0;
      listeners.forEach((l) => l());
    } else {
      hiddenAt = 0;
    }
  };
  document.addEventListener('visibilitychange', onVis);
}

export function initScreenshotDetection() {
  if (installed) return;
  installed = true;
  if (isNative()) setupNative();
  else setupWeb();
}

export function onScreenshot(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export async function notifyScreenshot(opts: {
  senderId: string;
  receiverId: string;
  category: 'work' | 'audience' | 'direct';
}) {
  try {
    await supabase.from('messages').insert({
      sender_id: opts.senderId,
      receiver_id: opts.receiverId,
      category: opts.category,
      content: '📸 تم التقاط لقطة شاشة لهذه المحادثة',
      is_important: true,
    });
  } catch {
    /* swallow */
  }
}
