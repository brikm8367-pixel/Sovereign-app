/**
 * E2E Key Manager — handles key generation, encrypted-at-rest storage,
 * per-device key registration, and message encrypt/decrypt with detailed status.
 * Includes retry mechanism and recovery flow for improved reliability.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  generateKeyPair,
  encryptMessage,
  decryptMessage,
  isEncryptedMessage,
  storeKeysSecure,
  getStoredKeysSecure,
  clearKeysSecure,
  migrateLegacyKeysIfPresent,
} from './encryption';
import { getOrCreateDeviceSecret, getOrCreateDeviceId } from './cryptoHelpers';

export type EncryptResult =
  | { success: true; payload: string }
  | { success: false; reason: 'no_local_keys' | 'recipient_no_e2e' | 'encryption_failed' };

export type DecryptResult =
  | { success: true; plaintext: string }
  | { success: false; reason: 'not_encrypted' | 'no_local_keys' | 'sender_no_key' | 'decryption_failed' };

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 300;

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
    }
  }
  throw new Error('Max retries exceeded');
}

// Initialize E2E keys on login. Encrypted at rest. Registers public key in device_keys
// (does NOT overwrite profiles.public_key — each device gets its own row).
export async function initE2EKeys(userId: string): Promise<void> {
  try {
    // 1. Migrate any legacy plaintext keys.
    await migrateLegacyKeysIfPresent();

    const passphrase = getOrCreateDeviceSecret();
    const deviceId = getOrCreateDeviceId();

    let keys = await getStoredKeysSecure(passphrase);

    if (!keys) {
      keys = await generateKeyPair();
      await storeKeysSecure(keys.publicKey, keys.privateKey, passphrase);
    }

    // Upsert this device's public key with retry (one row per device, never overwrites others).
    await withRetry(async () => {
      const { error } = await supabase
        .from('device_keys' as any)
        .upsert(
          {
            user_id: userId,
            device_id: deviceId,
            public_key: keys!.publicKey,
            last_seen: new Date().toISOString(),
          },
          { onConflict: 'user_id,device_id' }
        );
      if (error) throw error;
    });

    // Backwards compatibility: ensure profiles.public_key has *some* key so older
    // recipients (that read profiles.public_key) can still encrypt to us. Only set
    // if missing, never overwrite.
    await withRetry(async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('public_key')
        .eq('id', userId)
        .single();
      if (!profile?.public_key) {
        await supabase.from('profiles').update({ public_key: keys!.publicKey }).eq('id', userId);
      }
    });
  } catch (e) {
    console.warn('[E2E] initE2EKeys failed, will retry on next login', e);
  }
}

// Get recipient's most-recently-seen device public key (fallback to profile).
export async function getRecipientPublicKey(recipientId: string): Promise<string | null> {
  try {
    const result = (await withRetry(() =>
      (supabase as any)
        .from('device_keys')
        .select('public_key, last_seen')
        .eq('user_id', recipientId)
        .order('last_seen', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then((r: any) => r)
    )) as any;
    if (result?.data?.public_key) return result.data.public_key;
  } catch {
    /* fall through to profile key */
  }
  try {
    const { data } = await supabase.from('profiles').select('public_key').eq('id', recipientId).single();
    return data?.public_key || null;
  } catch {
    return null;
  }
}

// Encrypt — returns explicit status. Caller must handle failure (no silent plaintext fallback).
export async function encryptForRecipient(content: string, recipientId: string): Promise<EncryptResult> {
  const keys = await getStoredKeysSecure();
  if (!keys) return { success: false, reason: 'no_local_keys' };

  const recipientPubKey = await getRecipientPublicKey(recipientId);
  if (!recipientPubKey) return { success: false, reason: 'recipient_no_e2e' };

  try {
    const payload = await encryptMessage(content, keys.privateKey, recipientPubKey);
    return { success: true, payload };
  } catch (err) {
    console.error('[E2E] encryption_failed', err);
    return { success: false, reason: 'encryption_failed' };
  }
}

export async function decryptFromSender(content: string, senderId: string): Promise<DecryptResult> {
  if (!isEncryptedMessage(content)) return { success: false, reason: 'not_encrypted' };

  const keys = await getStoredKeysSecure();
  if (!keys) return { success: false, reason: 'no_local_keys' };

  const senderPubKey = await getRecipientPublicKey(senderId);
  if (!senderPubKey) return { success: false, reason: 'sender_no_key' };

  try {
    const plaintext = await decryptMessage(content, keys.privateKey, senderPubKey);
    return { success: true, plaintext };
  } catch (err) {
    // Try all known device keys for this sender as fallback
    try {
      const { data: deviceKeys } = await supabase
        .from('device_keys' as any)
        .select('public_key')
        .eq('user_id', senderId)
        .order('last_seen', { ascending: false });

      const allKeys: any[] = deviceKeys ?? [];
      for (const dk of allKeys) {
        if (!dk.public_key || dk.public_key === senderPubKey) continue;
        try {
          const plaintext = await decryptMessage(content, keys.privateKey, dk.public_key);
          return { success: true, plaintext };
        } catch {
          continue;
        }
      }
    } catch {
      /* ignore */
    }
    console.error('[E2E] decryption_failed', err);
    return { success: false, reason: 'decryption_failed' };
  }
}

// Re-initialize keys from scratch (recovery flow).
export async function recoverE2EKeys(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const passphrase = getOrCreateDeviceSecret();
    const deviceId = getOrCreateDeviceId();

    const keys = await generateKeyPair();
    await storeKeysSecure(keys.publicKey, keys.privateKey, passphrase);

    await supabase
      .from('device_keys' as any)
      .upsert(
        {
          user_id: userId,
          device_id: deviceId,
          public_key: keys.publicKey,
          last_seen: new Date().toISOString(),
        },
        { onConflict: 'user_id,device_id' }
      );

    await supabase.from('profiles').update({ public_key: keys.publicKey }).eq('id', userId);
    return { success: true };
  } catch (e: any) {
    console.error('[E2E] recovery failed', e);
    return { success: false, error: e?.message ?? 'Unknown error' };
  }
}

export async function clearE2EKeysOnSignOut(): Promise<void> {
  try {
    await clearKeysSecure();
  } catch (e) {
    console.warn('[E2E] clearKeysSecure failed on sign-out', e);
  }
}

export { isEncryptedMessage };
