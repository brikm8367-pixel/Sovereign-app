/**
 * E2EE Key Backup — lets a user export their private key as an encrypted file
 * (protected by a passphrase they choose) and restore it on another device.
 *
 * The exported blob is AES-GCM encrypted with a PBKDF2-derived key, so the file
 * is useless without the passphrase. On import we re-store the keys in this
 * device's encrypted IndexedDB and re-register the public key.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  deriveKeyFromPassword,
  encryptBlobAESGCM,
  decryptBlobAESGCM,
  getOrCreateDeviceSecret,
  getOrCreateDeviceId,
} from './cryptoHelpers';
import { getStoredKeysSecure, storeKeysSecure } from './encryption';

const BACKUP_MAGIC = 'sovereign-e2e-key-backup';

export interface E2EBackupFile {
  app: 'sovereign';
  type: typeof BACKUP_MAGIC;
  v: 1;
  salt: string;
  blob: string;
  createdAt: string;
}

export type ExportResult =
  | { success: true; file: E2EBackupFile }
  | { success: false; reason: 'no_local_keys' | 'export_failed' };

export type ImportResult =
  | { success: true }
  | { success: false; reason: 'invalid_file' | 'wrong_passphrase' | 'import_failed' };

/** Export the local private/public key pair as a passphrase-encrypted backup file. */
export async function exportKeyBackup(passphrase: string): Promise<ExportResult> {
  try {
    const keys = await getStoredKeysSecure();
    if (!keys) return { success: false, reason: 'no_local_keys' };

    const { key, saltBase64 } = await deriveKeyFromPassword(passphrase);
    const blob = await encryptBlobAESGCM(
      key,
      JSON.stringify({ publicKey: keys.publicKey, privateKey: keys.privateKey }),
    );

    return {
      success: true,
      file: {
        app: 'sovereign',
        type: BACKUP_MAGIC,
        v: 1,
        salt: saltBase64,
        blob,
        createdAt: new Date().toISOString(),
      },
    };
  } catch (e) {
    console.error('[E2E] export_failed', e);
    return { success: false, reason: 'export_failed' };
  }
}

/** Restore keys from a backup file + passphrase, then re-register the device key. */
export async function importKeyBackup(
  raw: string,
  passphrase: string,
): Promise<ImportResult> {
  let parsed: E2EBackupFile;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { success: false, reason: 'invalid_file' };
  }
  if (!parsed || parsed.type !== BACKUP_MAGIC || !parsed.salt || !parsed.blob) {
    return { success: false, reason: 'invalid_file' };
  }

  let publicKey: string;
  let privateKey: string;
  try {
    const { key } = await deriveKeyFromPassword(passphrase, parsed.salt);
    const decrypted = await decryptBlobAESGCM(key, parsed.blob);
    const obj = JSON.parse(decrypted);
    publicKey = obj.publicKey;
    privateKey = obj.privateKey;
    if (!publicKey || !privateKey) throw new Error('missing keys');
  } catch {
    return { success: false, reason: 'wrong_passphrase' };
  }

  try {
    // Store restored keys encrypted-at-rest under this device's secret.
    await storeKeysSecure(publicKey, privateKey, getOrCreateDeviceSecret());

    // Re-register this device's public key so others can encrypt to us.
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (userId) {
      await supabase.from('device_keys' as any).upsert(
        {
          user_id: userId,
          device_id: getOrCreateDeviceId(),
          public_key: publicKey,
          last_seen: new Date().toISOString(),
        },
        { onConflict: 'user_id,device_id' },
      );
    }
    return { success: true };
  } catch (e) {
    console.error('[E2E] import_failed', e);
    return { success: false, reason: 'import_failed' };
  }
}

/** Trigger a browser download of the backup file. */
export function downloadBackupFile(file: E2EBackupFile) {
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sovereign-key-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
