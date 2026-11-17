"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginForm({ initialError }: { initialError?: string }) {
  const [message, setMessage] = useState(initialError ?? "");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    const identifier = String(form.get("identifier") || "").trim();
    const password = String(form.get("password") || "");

    try {
      let email = identifier;
      if (!identifier.includes("@")) {
        const response = await fetch("/api/auth/resolve-username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: identifier })
        });
        const result = await response.json();
        if (!response.ok || typeof result.email !== "string") {
          throw new Error(result.error || "بيانات الدخول غير صحيحة.");
        }
        email = result.email;
      }

      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error("بيانات الدخول غير صحيحة.");

      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تسجيل الدخول حاليًا.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <form onSubmit={submit} className="auth-form">
      <label>اسم المستخدم أو البريد الإلكتروني<input name="identifier" autoComplete="username" required maxLength={254} /></label>
      <label>كلمة المرور<input name="password" type="password" autoComplete="current-password" required maxLength={1024} /></label>
      <button type="submit" disabled={busy}>{busy ? "جارٍ تسجيل الدخول..." : "دخول إلى Orbita"}</button>
    </form>
    {message && <p className="notice" role="alert">{message}</p>}
    <p className="auth-muted"><Link href="/forgot-password">Forgot Password?</Link></p>
    <p className="auth-muted">ليس لديك حساب؟ <Link href="/signup">إنشاء حساب</Link></p>
  </>;
}
