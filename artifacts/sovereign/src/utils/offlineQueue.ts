/**
 * Offline Message Queue — queues messages when offline, sends when back online
 */

interface QueuedMessage {
  id: string;
  receiver_id: string;
  content: string;
  category: string;
  parent_id: string | null;
  voice_url: string | null;
  media_url: string | null;
  media_type: string | null;
  timestamp: number;
}

const QUEUE_KEY = 'directly_offline_queue';

export function getOfflineQueue(): QueuedMessage[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addToOfflineQueue(msg: Omit<QueuedMessage, 'id' | 'timestamp'>): void {
  const queue = getOfflineQueue();
  queue.push({
    ...msg,
    id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
  });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function clearOfflineQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
}

export function removeFromQueue(id: string): void {
  const queue = getOfflineQueue().filter(m => m.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function isOnline(): boolean {
  return navigator.onLine;
}

// Flush queued messages when back online
export async function flushOfflineQueue(
  sendFn: (msg: QueuedMessage) => Promise<boolean>
): Promise<number> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return 0;

  let sent = 0;
  for (const msg of queue) {
    try {
      const ok = await sendFn(msg);
      if (ok) {
        removeFromQueue(msg.id);
        sent++;
      }
    } catch {
      // Keep in queue for next attempt
    }
  }
  return sent;
}

// Auto-flush on reconnect
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    // Dispatch custom event so the app can handle it
    window.dispatchEvent(new CustomEvent('directly:online'));
  });
}
