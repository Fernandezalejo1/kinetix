import { describe, it, expect } from "vitest";
import {
  encryptJson,
  decryptBackup,
  isEncryptedBackup,
  kdfParams,
  ENCRYPT_FORMAT_VERSION,
  EncryptedBackup,
} from "../src/utils/encryption";

describe("encryption (WebCrypto backup cifrado)", () => {

  it("cifra y descifra ida y vuelta (formato versionado)", async () => {
    const payload = { app: "KINETIX", version: 1, data: { kg: 100, es: "peso" } };
    const enc = await encryptJson(payload, "secreto-123");
    expect(isEncryptedBackup(enc)).toBe(true);
    expect(enc.version).toBe(ENCRYPT_FORMAT_VERSION);
    expect(enc.kdf.iterations).toBeGreaterThan(10000);
    expect(enc.ciphertext).not.toContain("KINETIX");
    const back = await decryptBackup<typeof payload>(enc, "secreto-123");
    expect(back).toEqual(payload);
  });

  it("detecta que es un backup cifrado por la forma del objeto", () => {
    expect(
      isEncryptedBackup({
        app: "KINETIX",
        encrypted: true,
        format: "aes-gcm-256",
        iv: "abc",
        ciphertext: "xyz",
        kdf: { name: "PBKDF2", iterations: 100000, hash: "SHA-256", salt: "s" },
      } as EncryptedBackup)
    ).toBe(true);
    expect(isEncryptedBackup({ plain: true, data: {} })).toBe(false);
  });

  it("rechaza versiones futuras desconocidas", () => {
    expect(
      isEncryptedBackup({
        app: "KINETIX",
        encrypted: true,
        format: "aes-gcm-256",
        version: 999,
        iv: "abc",
        ciphertext: "xyz",
        kdf: { name: "PBKDF2", iterations: 100000, hash: "SHA-256", salt: "s" },
      } as EncryptedBackup)
    ).toBe(false);
  });

  it("falla con contraseña incorrecta", async () => {
    const enc = await encryptJson({ a: 1 }, "correcta");
    await expect(decryptBackup(enc, "incorrecta")).rejects.toThrow();
  });

  it("kdfParams lee iterations/hash del blob declarado (dentro de rango)", () => {
    const params = kdfParams({
      kdf: { name: "PBKDF2", iterations: 200000, hash: "SHA-512", salt: "x" },
    } as Partial<EncryptedBackup>);
    expect(params.iterations).toBe(200000);
    expect(params.hash).toBe("SHA-512");
  });

  it("kdfParams sanitiza iterations fuera de rango (DOoS)", () => {
    expect(() =>
      kdfParams({
        kdf: { name: "PBKDF2", iterations: 99999999, hash: "SHA-256", salt: "x" },
      } as Partial<EncryptedBackup>)
    ).toThrow("inválidos");

    expect(() =>
      kdfParams({
        kdf: { name: "PBKDF2", iterations: 100, hash: "SHA-256", salt: "x" },
      } as Partial<EncryptedBackup>)
    ).toThrow("inválidos");
  });

  it("kdfParams usa defaults cuando no hay blob", () => {
    const params = kdfParams(null);
    expect(params.hash).toBe("SHA-256");
  });

  it("kdfParams acepta SHA-384 y rechaza hash inválido", () => {
    const ok = kdfParams({
      kdf: { name: "PBKDF2", iterations: 150000, hash: "SHA-384", salt: "x" },
    } as Partial<EncryptedBackup>);
    expect(ok.hash).toBe("SHA-384");

    const bad = kdfParams({
      kdf: { name: "PBKDF2", iterations: 150000, hash: "MD5", salt: "x" },
    } as Partial<EncryptedBackup>);
    expect(bad.hash).toBe("SHA-256"); // fallback
  });
});