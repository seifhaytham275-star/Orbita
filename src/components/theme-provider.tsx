"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type OrbitaTheme = "dark" | "light";
type ThemeContextValue = { theme: OrbitaTheme; setTheme: (theme: OrbitaTheme) => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<OrbitaTheme>("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem("orbita-theme");
    const initial: OrbitaTheme = stored === "light" ? "light" : "dark";
    setThemeState(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  function setTheme(next: OrbitaTheme) {
    setThemeState(next);
    window.localStorage.setItem("orbita-theme", next);
    document.documentElement.dataset.theme = next;
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useOrbitaTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useOrbitaTheme must be used inside ThemeProvider");
  return context;
}
