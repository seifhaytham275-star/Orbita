"use client";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signUp({
        email: String(form.get("email") || ""),
        password: String(form.get("password") || ""),
        options: { data: { display_name: String(form.get("name") || "") }, emailRedirectTo: window.location.origin + "/dashboard" }
      });
      if (error) throw error;
      setMessage("تم إرسال طلب التسجيل. راجع بريدك الإلكتروني لتأكيد الحساب إذا كان تأكيد البريد مفعّلًا.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "تعذر إنشاء الحساب."); }
    finally { setBusy(false); }
  }
  return <main className="auth-shell"><section className="auth-card">
    <a href="/" className="auth-brand">ORBITA</a><p className="eyebrow">START YOUR WORKSPACE</p>
    <h1>إنشاء حساب</h1><p className="auth-muted">حساب العميل لا يحصل تلقائيًا على صلاحيات إدارة المنصة.</p>
    <form onSubmit={submit} className="auth-form">
      <label>اسمك<input name="name" required minLength={2} maxLength={80}/></label>
      <label>البريد الإلكتروني<input name="email" type="email" required autoComplete="email"/></label>
      <label>كلمة المرور<input name="password" type="password" required minLength={10} autoComplete="new-password"/></label>
      <button disabled={busy}>{busy ? "جارٍ الإنشاء..." : "إنشاء الحساب"}</button>
    </form>
    {message && <p className="notice">{message}</p>}
    <p className="auth-muted">لديك حساب؟ <a href="/login">تسجيل الدخول</a></p>
  </section></main>;
}
