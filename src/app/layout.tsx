import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Orbita | Business Workspace",
  description: "Arabic-first AI workspace for small businesses."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body><ThemeProvider>{children}</ThemeProvider></body>
    </html>
  );
}
