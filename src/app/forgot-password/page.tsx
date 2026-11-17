"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage(""); setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`
      });
      if (resetError) throw resetError;
      setMessage("لو كان البريد مسجلًا ومؤكدًا لحسابك، هتوصلك رسالة فيها رابط آمن لتغيير كلمة المرور. راجع صندوق الوارد والرسائل غير المرغوب فيها.");
    } catch {
      setError("تعذر إرسال رابط الاستعادة حاليًا. تأكد من البريد وحاول مرة أخرى بعد قليل.");
    } finally { setBusy(false); }
  }

  return <main className="auth-shell"><section className="auth-card auth-card-modern">
    <Link href="/" className="auth-brand">ORBITA</Link>
    <p className="eyebrow">ACCOUNT RECOVERY</p>
    <h1>نسيت كلمة المرور؟</h1>
    <p className="auth-muted">اكتب بريد الاسترداد الذي أضفته وأكدته من إعدادات حسابك. هنرسل لك رابطًا آمنًا لتعيين كلمة مرور جديدة.</p>
    <form onSubmit={submit} className="auth-form">
      <label>Enter your email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required maxLength={254} placeholder="name@example.com" /></label>
      <button type="submit" disabled={busy}>{busy ? "جارٍ إرسال الرابط..." : "إرسال رابط الاستعادة"}</button>
    </form>
    {message && <p className="notice" role="status">{message}</p>}
    {error && <p className="notice notice-error" role="alert">{error}</p>}
    <p className="auth-muted"><Link href="/login">العودة إلى تسجيل الدخول</Link></p>
  </section></main>;
}
