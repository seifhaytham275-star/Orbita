"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setReady(Boolean(data.session));
        if (!data.session) setError("رابط الاستعادة غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا.");
      }
    });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    if (password.length < 12) { setError("استخدم كلمة مرور من 12 حرفًا على الأقل."); return; }
    if (password !== confirm) { setError("كلمتا المرور غير متطابقتين."); return; }
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setMessage("تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.");
      await supabase.auth.signOut();
      window.setTimeout(() => router.replace("/login"), 1200);
    } catch {
      setError("تعذر تغيير كلمة المرور. اطلب رابط استعادة جديدًا وحاول مرة أخرى.");
    } finally { setBusy(false); }
  }

  return <main className="auth-shell"><section className="auth-card auth-card-modern">
    <Link href="/" className="auth-brand">ORBITA</Link>
    <p className="eyebrow">SECURE YOUR ACCOUNT</p>
    <h1>إنشاء كلمة مرور جديدة</h1>
    <p className="auth-muted">اختار كلمة مرور قوية لا تستخدمها في مواقع أخرى.</p>
    {ready ? <form onSubmit={submit} className="auth-form">
      <label>كلمة المرور الجديدة<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" minLength={12} required /></label>
      <label>تأكيد كلمة المرور<input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password" minLength={12} required /></label>
      <button type="submit" disabled={busy}>{busy ? "جارٍ حفظ كلمة المرور..." : "حفظ كلمة المرور الجديدة"}</button>
    </form> : <p className="auth-muted">جارٍ التحقق من رابط الاستعادة...</p>}
    {message && <p className="notice" role="status">{message}</p>}
    {error && <p className="notice notice-error" role="alert">{error}</p>}
    <p className="auth-muted"><Link href="/login">العودة إلى تسجيل الدخول</Link></p>
  </section></main>;
}
