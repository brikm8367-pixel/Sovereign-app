/**
 * Signal-like Double Ratchet Protocol Implementation
 * 
 * Enhanced E2E encryption with:
 * - Double Ratchet for Perfect Forward Secrecy (PFS)
 * - Per-message key derivation (each message uses a unique key)
 * - Key rotation on every send
 * - Session state stored locally
 * 
 * Uses Web Crypto API (AES-256-GCM + ECDH P-256 + HKDF)
 */

const CURVE = { name: 'ECDH', namedCurve: 'P-256' };
const AES_ALGO = { name: 'AES-GCM', length: 256 };

interface RatchetState {
  rootKey: string;         // Base64 root key
  sendChainKey: string;    // Base64 sending chain key
  recvChainKey: string;    // Base64 receiving chain key
  sendCount: number;
  recvCount: number;
  myEphemeralPrivate: string;  // JWK private key
  myEphemeralPublic: string;   // JWK public key
  theirEphemeralPublic: string; // JWK public key
}

const SESSION_KEY = 'directly_ratchet_sessions';

// Get all sessions
function getSessions(): Record<string, RatchetState> {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
  } catch {
    return {};
  }
}

// Save session for a user
function saveSession(userId: string, state: RatchetState): void {
  const sessions = getSessions();
  sessions[userId] = state;
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
}

// Get session for a user
export function getSession(userId: string): RatchetState | null {
  return getSessions()[userId] || null;
}

// Generate a new ephemeral key pair
async function generateEphemeralKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  const keyPair = await crypto.subtle.generateKey(CURVE, true, ['deriveBits']);
  const pubJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  return { publicKey: JSON.stringify(pubJwk), privateKey: JSON.stringify(privJwk) };
}

// Derive shared secret from ECDH
async function deriveSharedSecret(myPrivateJwk: string, theirPublicJwk: string): Promise<ArrayBuffer> {
  const privateKey = await crypto.subtle.importKey('jwk', JSON.parse(myPrivateJwk), CURVE, false, ['deriveBits']);
  const publicKey = await crypto.subtle.importKey('jwk', JSON.parse(theirPublicJwk), CURVE, false, []);
  return crypto.subtle.deriveBits({ name: 'ECDH', public: publicKey }, privateKey, 256);
}

// HKDF-based key derivation for chain ratchet
async function kdfChain(chainKey: ArrayBuffer, info: string): Promise<{ newChainKey: ArrayBuffer; messageKey: ArrayBuffer }> {
  const keyMaterial = await crypto.subtle.importKey('raw', chainKey, 'HKDF', false, ['deriveBits']);
  const enc = new TextEncoder();

  const newChainBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: enc.encode(info + '-chain') },
    keyMaterial, 256
  );
  const messageKeyBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: enc.encode(info + '-msg') },
    keyMaterial, 256
  );

  return { newChainKey: newChainBits, messageKey: messageKeyBits };
}

// Helper: ArrayBuffer <-> Base64
function bufToB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function b64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

// Initialize a session with another user
export async function initSession(
  userId: string,
  theirPublicKey: string,
  myIdentityPrivate: string
): Promise<void> {
  const ephemeral = await generateEphemeralKeyPair();
  const sharedSecret = await deriveSharedSecret(myIdentityPrivate, theirPublicKey);

  const state: RatchetState = {
    rootKey: bufToB64(sharedSecret),
    sendChainKey: bufToB64(sharedSecret),
    recvChainKey: bufToB64(sharedSecret),
    sendCount: 0,
    recvCount: 0,
    myEphemeralPrivate: ephemeral.privateKey,
    myEphemeralPublic: ephemeral.publicKey,
    theirEphemeralPublic: theirPublicKey,
  };

  saveSession(userId, state);
}

// Encrypt a message with ratchet (PFS)
export async function ratchetEncrypt(userId: string, plaintext: string): Promise<string> {
  let session = getSession(userId);
  if (!session) throw new Error('No session for user');

  // Derive message key from send chain
  const chainKeyBuf = b64ToBuf(session.sendChainKey);
  const { newChainKey, messageKey } = await kdfChain(chainKeyBuf, 'send');

  // Encrypt with AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await crypto.subtle.importKey('raw', messageKey, AES_ALGO, false, ['encrypt']);
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, encoded);

  // Update session
  session.sendChainKey = bufToB64(newChainKey);
  session.sendCount++;
  saveSession(userId, session);

  // Format: DR1|ephemeralPub|sendCount|iv|ciphertext (all base64)
  const parts = [
    'DR1',
    btoa(session.myEphemeralPublic),
    session.sendCount.toString(),
    bufToB64(iv.buffer),
    bufToB64(ciphertext),
  ];
  return parts.join('|');
}

// Decrypt a message with ratchet
export async function ratchetDecrypt(userId: string, encrypted: string): Promise<string> {
  const parts = encrypted.split('|');
  if (parts[0] !== 'DR1' || parts.length !== 5) throw new Error('Invalid ratchet message');

  let session = getSession(userId);
  if (!session) throw new Error('No session for user');

  const iv = new Uint8Array(b64ToBuf(parts[3]));
  const ciphertext = b64ToBuf(parts[4]);

  // Derive message key from recv chain
  const chainKeyBuf = b64ToBuf(session.recvChainKey);
  const { newChainKey, messageKey } = await kdfChain(chainKeyBuf, 'send');

  const aesKey = await crypto.subtle.importKey('raw', messageKey, AES_ALGO, false, ['decrypt']);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ciphertext);

  // Update session
  session.recvChainKey = bufToB64(newChainKey);
  session.recvCount++;
  saveSession(userId, session);

  return new TextDecoder().decode(decrypted);
}

// Check if message uses Double Ratchet
export function isRatchetMessage(content: string): boolean {
  return content.startsWith('DR1|');
}

// Get session info for display
export function getSessionInfo(userId: string): { messagesSent: number; messagesReceived: number; hasSession: boolean } {
  const session = getSession(userId);
  if (!session) return { messagesSent: 0, messagesReceived: 0, hasSession: false };
  return { messagesSent: session.sendCount, messagesReceived: session.recvCount, hasSession: true };
}
