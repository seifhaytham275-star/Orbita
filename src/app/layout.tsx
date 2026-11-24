import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./orbita-ui-v2.css";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Orbita | Business Workspace",
  description: "Arabic-first AI workspace for small businesses."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#080d18"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body><ThemeProvider>{children}</ThemeProvider></body>
    </html>
  );
}
