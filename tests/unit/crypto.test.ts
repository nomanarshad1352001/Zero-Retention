import { describe, expect, it } from "vitest";
import { decryptVault, encryptVault, parseVaultFile, VaultDecryptError, vaultFilename, passcodeStrength } from "@/lib/crypto-client";
import { buildMockAnalysis } from "@/lib/mock-analysis";

const payload = { version: 1 as const, createdAt: new Date().toISOString(), situation: "secret text", result: buildMockAnalysis("x", "paid") };
// Fewer iterations keep the unit test fast; production uses 600k (default).
const ITER = 20_000;

describe("vault crypto", () => {
  it("round-trips with the right passcode", async () => {
    const file = await encryptVault(payload, "correct horse battery", ITER);
    expect(file.v).toBe(1);
    expect(file.kdf).toBe("PBKDF2-SHA256");
    expect(file.iter).toBe(ITER);
    expect(JSON.stringify(file)).not.toContain("secret text");
    const out = await decryptVault(parseVaultFile(JSON.stringify(file)), "correct horse battery");
    expect(out).toEqual(payload);
  });

  it("fails with the wrong passcode", async () => {
    const file = await encryptVault(payload, "correct horse battery", ITER);
    await expect(decryptVault(file, "wrong passcode!")).rejects.toBeInstanceOf(VaultDecryptError);
  });

  it("fails on tampered ciphertext", async () => {
    const file = await encryptVault(payload, "correct horse battery", ITER);
    const bytes = Buffer.from(file.ct, "base64");
    bytes[5] ^= 0xff;
    await expect(decryptVault({ ...file, ct: bytes.toString("base64") }, "correct horse battery")).rejects.toBeInstanceOf(VaultDecryptError);
  });

  it("uses fresh salt and IV each time", async () => {
    const a = await encryptVault(payload, "correct horse battery", ITER);
    const b = await encryptVault(payload, "correct horse battery", ITER);
    expect(a.salt).not.toBe(b.salt);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ct).not.toBe(b.ct);
  });

  it("enforces a minimum passcode length and rejects non-vault files", async () => {
    await expect(encryptVault(payload, "short", ITER)).rejects.toThrow();
    expect(() => parseVaultFile("{}")).toThrow(VaultDecryptError);
    expect(() => parseVaultFile("not json")).toThrow(VaultDecryptError);
  });

  it("names files and rates passcodes", () => {
    expect(vaultFilename(new Date(2025, 0, 31, 14, 2))).toBe("vault-20250131-1402.vault.json");
    expect(passcodeStrength("abc").score).toBe(0);
    expect(passcodeStrength("Tr0ub4dor&3xyzabc").score).toBe(3);
  });
});
