import type { Metadata } from "next";
import "./style.css";
export const metadata: Metadata = { title: "Orbita Admin", description: "Private Orbita platform administration" };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="ar" dir="rtl"><body>{children}</body></html>; }
