import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { api } from './api';

/** Returns true if the browser supports WebAuthn at all. */
export function isPasskeySupported(): boolean {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential;
}

/**
 * Returns true if the device can use a *platform* authenticator
 * (Windows Hello, Touch ID, Android biometrics, etc.) — i.e. fingerprint/face login.
 *
 * Some browsers report `false` even when a platform authenticator exists, so we
 * still let the user try if WebAuthn itself is supported.
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isPasskeySupported()) return false;
  try {
    if (window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch {}
  return false;
}

/** Enrol a new passkey for the currently logged-in user. */
export async function registerPasskey(nickname?: string): Promise<void> {
  const options = await api.passkeyRegisterOptions();
  const registration = await startRegistration({ optionsJSON: options });
  await api.passkeyRegisterVerify({ registration, nickname });
}

/** Authenticate using a registered passkey. Returns the JWT + user. */
export async function loginWithPasskey(email?: string): Promise<{ token: string; user: any }> {
  const options = await api.passkeyLoginOptions(email);
  const response = await startAuthentication({ optionsJSON: options });
  return api.passkeyLoginVerify({ response, email });
}
