import { gcm } from '@noble/ciphers/aes.js';
import { VisitSubmission } from '../types/visit';

/**
 * Visits go to the server sealed with AES-256-GCM (see App\Services\VisitPayload on the backend).
 * The key ships inside the app, so it does not stop a determined cheater. It only keeps the format of a
 * visit out of sight of anyone who opens the network tab in the browser.
 * The key is not in git: EXPO_PUBLIC_VISIT_KEY in .env.local (and in the EAS environment for builds).
 */
const KEY = decodeKey(process.env.EXPO_PUBLIC_VISIT_KEY);

function decodeKey(base64: string | undefined): Uint8Array | null {
  if (!base64) return null;
  const bytes = fromBase64(base64.trim());
  return bytes.length === 32 ? bytes : null;
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function nonce(): Uint8Array {
  const bytes = new Uint8Array(12);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    // Hermes may lack crypto; a nonce only has to differ between visits, not be secret.
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

/** Body of POST /visits. Without a key (local development) the visit goes as plain JSON. */
export function sealVisit(submission: VisitSubmission): string {
  if (!KEY) return JSON.stringify(submission);
  const iv = nonce();
  const sealed = gcm(KEY, iv).encrypt(new TextEncoder().encode(JSON.stringify(submission)));
  const out = new Uint8Array(iv.length + sealed.length);
  out.set(iv);
  out.set(sealed, iv.length);
  return JSON.stringify({ p: toBase64(out) });
}
