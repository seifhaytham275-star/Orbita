"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر تسجيل الدخول.");
      router.replace("/admin");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "بيانات الدخول غير صحيحة.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-shell"><section className="auth-card">
    <Link href="/" className="auth-brand">ORBITA</Link>
    <p className="eyebrow">PRIVATE PLATFORM ACCESS</p>
    <h1>دخول الأدمن</h1>
    <p className="auth-muted">صفحة مستقلة لإدارة منصة Orbita. لا تستخدم بريدًا إلكترونيًا.</p>
    {message && <p className="notice">{message}</p>}
    <form onSubmit={submit} className="auth-form">
      <label>اسم المستخدم<input value={username} onChange={event=>setUsername(event.target.value)} autoComplete="username" required maxLength={64}/></label>
      <label>كلمة المرور<input value={password} onChange={event=>setPassword(event.target.value)} type="password" autoComplete="current-password" required maxLength={200}/></label>
      <button disabled={busy}>{busy ? "جارٍ التحقق..." : "دخول لوحة الأدمن"}</button>
    </form>
    <p className="auth-muted"><Link href="/login">العودة إلى دخول العملاء</Link></p>
  </section></main>;
}
