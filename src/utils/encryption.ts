// Cifrado AES-GCM basado en WebCrypto (subtle). Se usa para exportar backups
// cifrados con contraseña si el usuario así lo elige. Todo ocurre en el
// dispositivo: la contraseña no sale ni se guarda.

// Formato versionado: KDFv1 (PBKDF2). El archivo declara iterations y hash
// usados al cifrar; al descifrar se usan LOS VALORES DECLARADOS (con sanitizado
// de rango), no constantes fijas. Así un backup cifrado con otras iteraciones
// sigue siendo legible y el formato admite migraciones futuras.
export const ENCRYPT_FORMAT_VERSION = 1;
const DEFAULTS = {
  iterations: 150_000,
  hash: "SHA-256",
};
const MIN_ITERATIONS = 10_000;
const MAX_ITERATIONS = 5_000_000;
const ALLOWED_HASHES = new Set(["SHA-256", "SHA-384", "SHA-512"]);

export const textEncoder = () => new TextEncoder();
export const textDecoder = () => new TextDecoder();

function concatU8(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

/** KDF params seguros: usa lo declarado en el backup cuando está dentro de
 *  rango; si el archivo no declara nada, usa los defaults. Un archivo con
 *  valores absurdos (ej. 10^9 iteraciones) se rechaza en vez de congelar. */
export function kdfParams(blob?: Partial<EncryptedBackup> | null): { iterations: number; hash: string } {
  const declared = blob?.kdf;
  const iterations =
    declared && typeof declared.iterations === "number" && Number.isInteger(declared.iterations)
      ? declared.iterations
      : DEFAULTS.iterations;
  const hash =
    declared && typeof declared.hash === "string" && ALLOWED_HASHES.has(declared.hash)
      ? declared.hash
      : DEFAULTS.hash;
  if (iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) {
    throw new Error("Formato de backup no soportado: parámetros de derivación inválidos");
  }
  return { iterations, hash };
}

// Deriva una clave AES-GCM de 256 bits a partir de la contraseña + salt.
async function deriveKey(password: string, salt: Uint8Array, params: { iterations: number; hash: string }): Promise<CryptoKey> {
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
      iterations: params.iterations,
      hash: params.hash as "SHA-256" | "SHA-384" | "SHA-512",
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
  /** Versión del formato cifrado. Ausente = v1 (legado). */
  version?: number;
  kdf: { name: "PBKDF2"; iterations: number; hash: string; salt: string };
  iv: string;
  ciphertext: string;
};

export async function encryptJson(payload: unknown, password: string): Promise<EncryptedBackup> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const params = { iterations: DEFAULTS.iterations, hash: DEFAULTS.hash };
  const key = await deriveKey(password, salt, params);
  const plain = textEncoder().encode(JSON.stringify(payload));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain)
  );
  return {
    app: "KINETIX",
    encrypted: true,
    format: "aes-gcm-256",
    version: ENCRYPT_FORMAT_VERSION,
    kdf: { name: "PBKDF2", iterations: params.iterations, hash: params.hash, salt: toB64(salt) },
    iv: toB64(iv),
    ciphertext: toB64(ct),
  };
}

export async function decryptBackup<T>(blob: EncryptedBackup, password: string): Promise<T> {
  const salt = fromB64(blob.kdf.salt);
  const iv = fromB64(blob.iv);
  const params = kdfParams(blob);
  const key = await deriveKey(password, salt, params);
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
  if (!(o.encrypted === true && o.format === "aes-gcm-256")) return false;
  // Versión declarada: solo soportamos v1 por ahora.
  if (o.version !== undefined && (typeof o.version !== "number" || o.version > ENCRYPT_FORMAT_VERSION)) {
    return false;
  }
  return (
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