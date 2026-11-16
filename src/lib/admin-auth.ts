import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "orbita_admin_session";
const SESSION_SECONDS = 60 * 60 * 8;

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function sign(value: string) {
  const secret = process.env.ORBITA_ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("Admin session secret is not configured.");
  return createHmac("sha256", secret).update(value).digest("hex");
}

export async function createAdminSession(username: string) {
  const payload = Buffer.from(JSON.stringify({
    username,
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_SECONDS
  })).toString("base64url");
  const token = payload + "." + sign(payload);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_SECONDS
  });
}

export async function getAdminSession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  try {
    if (!safeEqual(signature, sign(payload))) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { username?: unknown; expiresAt?: unknown };
    if (typeof data.username !== "string" || typeof data.expiresAt !== "number" || !Number.isSafeInteger(data.expiresAt) || data.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    return { username: data.username, expiresAt: data.expiresAt };
  } catch { return null; }
}

export async function clearAdminSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
}
