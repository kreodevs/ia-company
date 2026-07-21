import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const PREFIX = "enc:v1:";
const ALGO = "aes-256-gcm";

function deriveKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY ?? process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("ENCRYPTION_KEY or JWT_SECRET is required to encrypt secrets");
  }
  return scryptSync(secret, "auto-company-platform", 32);
}

export function encryptSecret(plaintext: string): string {
  if (!plaintext || plaintext.startsWith(PREFIX)) return plaintext;

  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptSecret(stored: string | null | undefined): string | undefined {
  if (!stored) return undefined;
  if (!stored.startsWith(PREFIX)) return stored;

  const key = deriveKey();
  const payload = stored.slice(PREFIX.length);
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) return stored;

  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function maskSecret(_value: string | null | undefined): string | null {
  return _value ? "••••••••" : null;
}
