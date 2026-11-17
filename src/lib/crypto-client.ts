/**
 * Browser-native encryption for the "Save to My Phone Vault" export.
 * PBKDF2-SHA-256 (600k iterations, random 16-byte salt) -> AES-GCM-256, random 12-byte IV.
 * Pure Web Crypto; also runs under Node 20+ (globalThis.crypto) for unit tests.
 * Nothing here touches storage of any kind.
 */

export const VAULT_VERSION = 1 as const;
export const PBKDF2_ITERATIONS = 600_000;
export const MIN_PASSCODE_LENGTH = 8;

export interface VaultFile {
  v: typeof VAULT_VERSION;
  kdf: "PBKDF2-SHA256";
  iter: number;
  salt: string; // base64
  iv: string; // base64
  ct: string; // base64 (AES-GCM ciphertext + tag)
}

export interface VaultPayload<T = unknown> {
  version: 1;
  createdAt: string;
  situation: string;
  result: T;
}

const subtle = () => globalThis.crypto.subtle;

export function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < u8.length; i += 0x8000) {
    bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

export function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(passcode: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const material = await subtle().importKey("raw", new TextEncoder().encode(passcode), "PBKDF2", false, ["deriveKey"]);
  return subtle().deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptVault(payload: VaultPayload, passcode: string, iterations = PBKDF2_ITERATIONS): Promise<VaultFile> {
  if (passcode.length < MIN_PASSCODE_LENGTH) throw new Error("Passcode too short");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passcode, salt, iterations);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ct = await subtle().encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, plaintext);
  return { v: VAULT_VERSION, kdf: "PBKDF2-SHA256", iter: iterations, salt: toBase64(salt), iv: toBase64(iv), ct: toBase64(ct) };
}

export class VaultDecryptError extends Error {
  constructor(message = "Wrong passcode or corrupted file") {
    super(message);
    this.name = "VaultDecryptError";
  }
}

export function parseVaultFile(text: string): VaultFile {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new VaultDecryptError("Not a vault file");
  }
  if (
    !obj ||
    typeof obj !== "object" ||
    (obj as VaultFile).v !== VAULT_VERSION ||
    (obj as VaultFile).kdf !== "PBKDF2-SHA256" ||
    typeof (obj as VaultFile).iter !== "number" ||
    typeof (obj as VaultFile).salt !== "string" ||
    typeof (obj as VaultFile).iv !== "string" ||
    typeof (obj as VaultFile).ct !== "string"
  ) {
    throw new VaultDecryptError("Not a vault file");
  }
  return obj as VaultFile;
}

export async function decryptVault(file: VaultFile, passcode: string): Promise<VaultPayload> {
  const iterations = Math.min(Math.max(file.iter, 1), 5_000_000);
  const key = await deriveKey(passcode, fromBase64(file.salt), iterations);
  let pt: ArrayBuffer;
  try {
    pt = await subtle().decrypt({ name: "AES-GCM", iv: fromBase64(file.iv) as BufferSource }, key, fromBase64(file.ct) as BufferSource);
  } catch {
    throw new VaultDecryptError();
  }
  try {
    const parsed = JSON.parse(new TextDecoder().decode(pt)) as VaultPayload;
    if (parsed.version !== 1 || typeof parsed.situation !== "string") throw new Error();
    return parsed;
  } catch {
    throw new VaultDecryptError("Vault contents are invalid");
  }
}

/** Filename like vault-20250131-1422.vault.json (local time). */
export function vaultFilename(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `vault-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.vault.json`;
}

/** Very small, honest strength hint (not a security guarantee). */
export function passcodeStrength(pw: string): { score: 0 | 1 | 2 | 3; label: string } {
  let score = 0;
  if (pw.length >= MIN_PASSCODE_LENGTH) score++;
  if (pw.length >= 14) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) && score < 3) score++;
  const s = Math.min(score, 3) as 0 | 1 | 2 | 3;
  return { score: s, label: ["Too short", "Weak", "Okay", "Strong"][s] };
}

/** Trigger a download without leaving anything behind (object URL revoked as soon as the download starts). */
export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Some browsers cancel a download if the blob URL is revoked in the same tick.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
