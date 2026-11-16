const PRODUCTION_SITE_URL = "https://orbita-seifhaytham275-star.vercel.app";

function normalizeSiteUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  const url = new URL(trimmed);
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS outside local development.");
  }
  return url.origin;
}

/**
 * Returns the canonical application URL for auth emails.
 * Never use window.location.origin here: signup can be initiated from a
 * local preview, which would bake localhost into the confirmation email.
 */
export function getPublicSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return normalizeSiteUrl(configured);

  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelUrl) return normalizeSiteUrl(vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`);

  return process.env.NODE_ENV === "production" ? PRODUCTION_SITE_URL : "http://localhost:3000";
}
