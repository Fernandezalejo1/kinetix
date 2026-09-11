import { describe, it, expect } from "vitest";
import {
  encryptJson,
  decryptBackup,
  isEncryptedBackup,
  EncryptedBackup,
} from "../src/utils/encryption";

describe("encryption (WebCrypto backup cifrado)", () => {

  it("cifra y descifra ida y vuelta", async () => {
    const payload = { app: "KINETIX", version: 1, data: { kg: 100, es: "peso" } };
    const enc = await encryptJson(payload, "secreto-123");
    expect(isEncryptedBackup(enc)).toBe(true);
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
        kdf: { name: "PBKDF2", iterations: 1, hash: "SHA-256", salt: "s" },
      } as EncryptedBackup)
    ).toBe(true);
    expect(isEncryptedBackup({ plain: true, data: {} })).toBe(false);
  });

  it("falla con contraseña incorrecta", async () => {
    const enc = await encryptJson({ a: 1 }, "correcta");
    await expect(decryptBackup(enc, "incorrecta")).rejects.toThrow();
  });
});