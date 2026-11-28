import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function encryptionKey(): Buffer {
  const raw = process.env.ORBITA_USER_KEY_ENCRYPTION_KEY;
  if (!raw) throw new Error("لم يتم إعداد ORBITA_USER_KEY_ENCRYPTION_KEY على الخادم.");
  const key = /^[a-f0-9]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("ORBITA_USER_KEY_ENCRYPTION_KEY يجب أن يكون مفتاحًا عشوائيًا بطول 32 بايت.");
  return key;
}

export function encryptUserApiKey(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return { encrypted_key: encrypted.toString("base64"), iv: iv.toString("base64"), auth_tag: cipher.getAuthTag().toString("base64") };
}

export function decryptUserApiKey(row: { encrypted_key: string; iv: string; auth_tag: string }): string {
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(row.iv, "base64"));
  decipher.setAuthTag(Buffer.from(row.auth_tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(row.encrypted_key, "base64")), decipher.final()]).toString("utf8");
}
