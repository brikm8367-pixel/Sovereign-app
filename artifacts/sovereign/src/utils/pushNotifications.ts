import { supabase } from '@/integrations/supabase/client';

let cachedVapidKey: string | null = null;

async function getVapidKey(): Promise<string | null> {
  if (cachedVapidKey) return cachedVapidKey;
  
  // Try env var first
  const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (envKey) { cachedVapidKey = envKey; return envKey; }

  // Fetch from edge function
  try {
    const { data, error } = await supabase.functions.invoke('get-vapid-key');
    if (!error && data?.key) {
      cachedVapidKey = data.key;
      return data.key;
    }
  } catch (e) {
    console.error('Failed to fetch VAPID key:', e);
  }
  return null;
}

export async function registerPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  try {
    const registration = await navigator.serviceWorker.register('/sw-push.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const vapidKey = await getVapidKey();
    if (!vapidKey) {
      console.log('VAPID public key not available');
      return;
    }

    const subscription = await (registration as any).pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const subJson = subscription.toJSON();
    await supabase.from('push_subscriptions').upsert({
      user_id: auth.user.id,
      endpoint: subJson.endpoint!,
      p256dh: subJson.keys!.p256dh,
      auth: subJson.keys!.auth,
    }, { onConflict: 'user_id,endpoint' as any });

    console.log('Push notifications registered successfully');
  } catch (error) {
    console.error('Push registration error:', error);
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

/** Show in-app notification with sound when a message arrives */
export function showInAppNotification(title: string, body: string) {
  if (Notification.permission === 'granted') {
    const n = new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      tag: 'directly-msg',
    });
    setTimeout(() => n.close(), 5000);
  }
}
