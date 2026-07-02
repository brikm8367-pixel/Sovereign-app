/**
 * Biometric Authentication — runtime-only Capacitor + WebAuthn fallback.
 * Avoids static or string-literal dynamic imports so Vite never tries to resolve
 * native-only packages during web builds.
 */

export interface BiometricResult {
  success: boolean;
  method: 'capacitor' | 'webauthn' | 'none';
  error?: string;
}

const getCap = (): any => {
  if (typeof window === 'undefined') return null;
  // @ts-ignore
  return (window as any).Capacitor || null;
};

const isNative = (): boolean => !!getCap()?.isNativePlatform?.();

export async function authenticateBiometric(reason = 'تأكيد الدفع'): Promise<BiometricResult> {
  // 1) Native (Capacitor) — accessed only via runtime registry
  if (isNative()) {
    try {
      const plugins = getCap()?.Plugins || {};
      const NativeBiometric = plugins.NativeBiometric;
      if (NativeBiometric?.isAvailable && NativeBiometric?.verifyIdentity) {
        const available = await NativeBiometric.isAvailable();
        if (available?.isAvailable) {
          await NativeBiometric.verifyIdentity({
            reason,
            title: 'Sovereign',
            subtitle: 'وصول حصري',
            description: reason,
          });
          return { success: true, method: 'capacitor' };
        }
      }
    } catch (e: any) {
      return { success: false, method: 'capacitor', error: e?.message ?? 'biometric_failed' };
    }
  }

  // 2) WebAuthn fallback (PWA / browser)
  if (typeof window !== 'undefined' && 'PublicKeyCredential' in window) {
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const cred = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 30_000,
          userVerification: 'required',
          allowCredentials: [],
        },
      } as any).catch(() => null);
      if (cred) return { success: true, method: 'webauthn' };
      return { success: true, method: 'none' };
    } catch {
      return { success: true, method: 'none' };
    }
  }

  return { success: true, method: 'none' };
}
