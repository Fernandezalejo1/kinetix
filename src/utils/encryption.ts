// Cifrado AES-GCM basado en WebCrypto (subtle). Se usa para exportar backups
// cifrados con contraseña si el usuario así lo elige. Todo ocurre en el
// dispositivo: la contraseña no sale ni se guarda.

const PBKDF2_ITERATIONS = 150_000;

export const textEncoder = () => new TextEncoder();
export const textDecoder = () => new TextDecoder();

function concatU8(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

// Deriva una clave AES-GCM de 256 bits a partir de la contraseña + salt.
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    textEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  crypto.getRandomValues(out);
  return out;
}

function toB64(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export type EncryptedBackup = {
  app: string;
  encrypted: true;
  format: "aes-gcm-256";
  kdf: { name: "PBKDF2"; iterations: number; hash: string; salt: string };
  iv: string;
  ciphertext: string;
};

export async function encryptJson(payload: unknown, password: string): Promise<EncryptedBackup> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveKey(password, salt);
  const plain = textEncoder().encode(JSON.stringify(payload));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain)
  );
  return {
    app: "KINETIX",
    encrypted: true,
    format: "aes-gcm-256",
    kdf: { name: "PBKDF2", iterations: PBKDF2_ITERATIONS, hash: "SHA-256", salt: toB64(salt) },
    iv: toB64(iv),
    ciphertext: toB64(ct),
  };
}

export async function decryptBackup<T>(blob: EncryptedBackup, password: string): Promise<T> {
  const salt = fromB64(blob.kdf.salt);
  const iv = fromB64(blob.iv);
  const key = await deriveKey(password, salt);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    fromB64(blob.ciphertext).buffer as ArrayBuffer
  );
  const json = textDecoder().decode(plain);
  // La API recibe { ...blob, version } tras la lectura por defecto.
  return JSON.parse(json) as T;
}

export function isEncryptedBackup(v: unknown): v is EncryptedBackup {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    o.encrypted === true &&
    o.format === "aes-gcm-256" &&
    typeof o.iv === "string" &&
    typeof o.ciphertext === "string" &&
    typeof o.kdf === "object" &&
    o.kdf !== null &&
    typeof (o.kdf as Record<string, unknown>).salt === "string"
  );
}

export const toUint8Safe = (b64: string, what: string): Uint8Array => {
  try {
    return fromB64(b64);
  } catch {
    throw new Error(`Backup inválido: ${what} no es base64 válida`);
  }
};