/**
 * Crypto helpers — PBKDF2 + AES-GCM for at-rest encryption of E2E private keys.
 * Used to encrypt the user's private key before storing it in IndexedDB.
 */

const PBKDF2_ITERATIONS = 200_000;

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function deriveKeyFromPassword(
  password: string,
  saltBase64?: string
): Promise<{ key: CryptoKey; saltBase64: string }> {
  const enc = new TextEncoder();
  const salt = saltBase64 ? fromBase64(saltBase64) : crypto.getRandomValues(new Uint8Array(16));
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  return { key, saltBase64: toBase64(salt) };
}

export async function encryptBlobAESGCM(key: CryptoKey, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext));
  const ctBytes = new Uint8Array(ct);
  const combined = new Uint8Array(iv.length + ctBytes.length);
  combined.set(iv);
  combined.set(ctBytes, iv.length);
  return toBase64(combined);
}

export async function decryptBlobAESGCM(key: CryptoKey, base64: string): Promise<string> {
  const combined = fromBase64(base64);
  const iv = combined.slice(0, 12);
  const ct = combined.slice(12);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(plain);
}

/**
 * Generate (or load) a per-device passphrase. This is stored once in localStorage
 * as a random 32-byte secret. It's not as strong as a user-chosen passphrase, but
 * it ensures the private key blob in IndexedDB is not directly readable as plaintext
 * and cannot be exfiltrated by a single XSS read on `directly_e2e_private_key`.
 *
 * Future improvement: replace with WebAuthn-protected passphrase or user PIN.
 */
const DEVICE_SECRET_KEY = 'directly_device_secret_v1';
export function getOrCreateDeviceSecret(): string {
  let s = localStorage.getItem(DEVICE_SECRET_KEY);
  if (!s) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    s = toBase64(bytes);
    localStorage.setItem(DEVICE_SECRET_KEY, s);
  }
  return s;
}

export function clearDeviceSecret(): void {
  localStorage.removeItem(DEVICE_SECRET_KEY);
}

const DEVICE_ID_KEY = 'directly_device_id_v1';
export function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
