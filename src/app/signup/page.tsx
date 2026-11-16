"use client";
import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function makePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = new Uint32Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, value => chars[value % chars.length]).join("");
}

export default function SignupPage() {
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  const [password,setPassword] = useState("");
  const [showPassword,setShowPassword] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const companyName = String(form.get("companyName") || "").trim();
    const industry = String(form.get("industry") || "").trim();
    const email = String(form.get("email") || "").trim();
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: companyName, company_name: companyName, industry },
          emailRedirectTo: window.location.origin + "/dashboard"
        }
      });
      if (error) throw error;
      setMessage("تم إرسال طلب إنشاء الحساب. راجع بريدك لتأكيد عنوانك، وبعد التأكيد ستظهر مساحة شركتك تلقائيًا. الوصول المجاني لمدة شهر واحد دون بطاقة بنكية أو تجديد تلقائي.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "تعذر إنشاء الحساب."); }
    finally { setBusy(false); }
  }
  return <main className="auth-shell"><section className="auth-card">
    <Link href="/" className="auth-brand">ORBITA</Link><p className="eyebrow">START YOUR WORKSPACE</p>
    <h1>إنشاء حساب شركتك</h1>
    <p className="auth-muted">شهر واحد وصول مجاني. لا بطاقة بنكية ولا خصم أو تجديد تلقائي.</p>
    <form onSubmit={submit} className="auth-form">
      <label>اسم الشركة<input name="companyName" required minLength={2} maxLength={120} autoComplete="organization"/></label>
      <label>مجال عمل الشركة
        <select name="industry" required defaultValue="">
          <option value="" disabled>اختر مجال النشاط</option>
          <option value="تجارة وبيع بالتجزئة">تجارة وبيع بالتجزئة</option>
          <option value="خدمات ومكاتب">خدمات ومكاتب</option>
          <option value="عيادات ومراكز طبية">عيادات ومراكز طبية</option>
          <option value="مطاعم وكافيهات">مطاعم وكافيهات</option>
          <option value="تعليم وتدريب">تعليم وتدريب</option>
          <option value="تصنيع ومخازن">تصنيع ومخازن</option>
          <option value="أخرى">أخرى</option>
        </select>
      </label>
      <label>البريد الإلكتروني<input name="email" type="email" required autoComplete="email"/></label>
      <label>كلمة المرور
        <input name="password" type={showPassword ? "text" : "password"} required minLength={12} maxLength={80} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} />
      </label>
      <button type="button" className="secondary-action" onClick={()=>setPassword(makePassword())}>توليد كلمة مرور قوية</button>
      <button type="button" className="secondary-action" onClick={()=>setShowPassword(value=>!value)}>{showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}</button>
      <button disabled={busy || password.length < 12}>{busy ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب مجانًا"}</button>
    </form>
    {message && <p className="notice">{message}</p>}
    <p className="auth-muted">لديك حساب؟ <Link href="/login">تسجيل الدخول</Link></p>
  </section></main>;
}
