"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminSetupPage() {
  const [setupCode, setSetupCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/setup").then(r=>r.json()).then(data=>setAvailable(data.available === true)).catch(()=>setAvailable(false));
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupCode, username, password, confirmPassword })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر إنشاء الحساب.");
      router.replace("/admin");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر إنشاء الحساب.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-shell"><section className="auth-card">
    <Link href="/" className="auth-brand">ORBITA</Link>
    <p className="eyebrow">ONE-TIME ADMIN SETUP</p>
    <h1>إنشاء حساب الأدمن</h1>
    {available === null ? <p className="auth-muted">جارٍ التحقق من حالة الإعداد...</p> : !available ? <><p className="notice">تم إنشاء حساب الأدمن بالفعل. استخدم صفحة تسجيل الدخول.</p><Link href="/admin/login">الذهاب إلى دخول الأدمن</Link></> : <>
      <p className="auth-muted">اختر اسم المستخدم وكلمة المرور بنفسك. لا نطلب بريدًا إلكترونيًا.</p>
      {message && <p className="notice">{message}</p>}
      <form onSubmit={submit} className="auth-form">
        <label>رمز الإعداد لمرة واحدة<input value={setupCode} onChange={e=>setSetupCode(e.target.value)} autoComplete="off" required/></label>
        <label>اسم المستخدم<input value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" minLength={3} maxLength={64} pattern="[A-Za-z0-9_.-]+" required/></label>
        <label>كلمة المرور (12 حرفًا على الأقل)<input value={password} onChange={e=>setPassword(e.target.value)} type="password" autoComplete="new-password" minLength={12} maxLength={200} required/></label>
        <label>تأكيد كلمة المرور<input value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} type="password" autoComplete="new-password" minLength={12} maxLength={200} required/></label>
        <button disabled={busy}>{busy ? "جارٍ إنشاء الحساب..." : "إنشاء حساب الأدمن"}</button>
      </form>
    </>}
    <p className="auth-muted"><Link href="/admin/login">العودة إلى دخول الأدمن</Link></p>
  </section></main>;
}
