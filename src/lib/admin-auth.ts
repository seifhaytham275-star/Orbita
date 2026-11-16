import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "orbita_admin_session";
const SESSION_SECONDS = 60 * 60 * 8;

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyAdminCredentials(username: string, password: string) {
  const expectedUsername = process.env.ORBITA_ADMIN_USERNAME?.trim().toLowerCase();
  const saltHex = process.env.ORBITA_ADMIN_PASSWORD_SALT;
  const expectedHash = process.env.ORBITA_ADMIN_PASSWORD_HASH;
  if (!expectedUsername || !saltHex || !expectedHash || !process.env.ORBITA_ADMIN_SESSION_SECRET) return false;
  if (!safeEqual(username.trim().toLowerCase(), expectedUsername)) return false;
  const actualHash = scryptSync(password, Buffer.from(saltHex, "hex"), 64).toString("hex");
  return safeEqual(actualHash, expectedHash);
}

function sign(value: string) {
  const secret = process.env.ORBITA_ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("Admin session secret is not configured.");
  return createHmac("sha256", secret).update(value).digest("hex");
}

export async function createAdminSession() {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = String(expiresAt);
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
  const [expiresAt, signature, extra] = token.split(".");
  if (!expiresAt || !signature || extra || !/^\d+$/.test(expiresAt)) return null;
  const expires = Number(expiresAt);
  if (!Number.isSafeInteger(expires) || expires <= Math.floor(Date.now() / 1000)) return null;
  try {
    if (!safeEqual(signature, sign(expiresAt))) return null;
  } catch { return null; }
  return { username: process.env.ORBITA_ADMIN_USERNAME || "admin", expiresAt: expires };
}

export async function clearAdminSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
}

export function isAdminAuthConfigured() {
  return Boolean(process.env.ORBITA_ADMIN_USERNAME && process.env.ORBITA_ADMIN_PASSWORD_SALT && process.env.ORBITA_ADMIN_PASSWORD_HASH && process.env.ORBITA_ADMIN_SESSION_SECRET);
}
