import type { CapacitorConfig } from "@capacitor/cli";

// The GitHub Actions installer workflow supplies the deployed HTTPS URL.
const appUrl = process.env.ORBITA_WEB_URL;
const config: CapacitorConfig = {
  appId: "com.orbita.business",
  appName: "Orbita",
  webDir: "public",
  server: appUrl ? { url: appUrl, cleartext: false, androidScheme: "https" } : undefined,
  android: { allowMixedContent: false }
};
export default config;
