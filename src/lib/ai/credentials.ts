import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function encryptionKey(): Buffer {
  const raw = process.env.CREDENTIALS_ENCRYPTION_KEY || "";
  if (!/^[a-f0-9]{64}$/i.test(raw)) throw new Error("إعداد تشفير مفاتيح الذكاء الاصطناعي غير مكتمل على الخادم.");
  return Buffer.from(raw, "hex");
}

export function encryptCredential(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map(part => part.toString("base64")).join(".");
}

export function decryptCredential(value: string): string {
  const [ivText, tagText, encryptedText] = value.split(".");
  if (!ivText || !tagText || !encryptedText) throw new Error("بيانات مفتاح Gemini المحفوظة غير صالحة.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64"));
  decipher.setAuthTag(Buffer.from(tagText, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedText, "base64")), decipher.final()]).toString("utf8");
}

export async function getUserGeminiKey(supabase: { from: (table: string) => any }, userId: string): Promise<string | null> {
  const { data, error } = await supabase.from("user_ai_credentials").select("encrypted_api_key").eq("user_id", userId).maybeSingle();
  if (error) throw new Error("تعذر تحميل إعداد Gemini.");
  return data?.encrypted_api_key ? decryptCredential(data.encrypted_api_key) : null;
}
