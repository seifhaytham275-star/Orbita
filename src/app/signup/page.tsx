"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function makePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = new Uint32Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, value => chars[value % chars.length]).join("");
}

export default function SignupPage() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const companyName = String(form.get("companyName") || "").trim();
    const industry = String(form.get("industry") || "").trim();
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, industry, password })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر إنشاء الحساب.");
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email: result.authEmail, password });
      if (error) throw new Error("تم إنشاء الحساب، لكن تعذر تسجيل الدخول تلقائيًا. استخدم اسم مستخدم شركتك لتسجيل الدخول.");
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر إنشاء الحساب.");
    } finally { setBusy(false); }
  }

  return <main className="auth-shell"><section className="auth-card auth-card-modern">
    <Link href="/" className="auth-brand">ORBITA</Link>
    <p className="eyebrow">START YOUR WORKSPACE</p>
    <h1>إنشاء حساب شركتك</h1>
    <p className="auth-muted">ابدأ مساحة عملك واحصل على شهر مجاني. لا تحتاج إلى بريد إلكتروني لإنشاء الحساب.</p>
    <form onSubmit={submit} className="auth-form">
      <label>اسم الشركة<input name="companyName" required minLength={2} maxLength={120} autoComplete="organization" /></label>
      <label>مجال عمل الشركة
        <select name="industry" required defaultValue="">
          <option value="" disabled>اختر مجال النشاط</option>
          <option value="تجارة التجزئة والمتاجر">تجارة التجزئة والمتاجر</option>
          <option value="التجارة الإلكترونية">التجارة الإلكترونية</option>
          <option value="تجارة الجملة والتوزيع">تجارة الجملة والتوزيع</option>
          <option value="مطاعم وكافيهات ومخابز">مطاعم وكافيهات ومخابز</option>
          <option value="الأغذية والمشروبات">الأغذية والمشروبات</option>
          <option value="السياحة والفنادق والضيافة">السياحة والفنادق والضيافة</option>
          <option value="العقارات وإدارة الأملاك">العقارات وإدارة الأملاك</option>
          <option value="المقاولات والبناء والتشطيبات">المقاولات والبناء والتشطيبات</option>
          <option value="التصنيع والإنتاج">التصنيع والإنتاج</option>
          <option value="المخازن وسلاسل الإمداد">المخازن وسلاسل الإمداد</option>
          <option value="النقل والشحن واللوجستيات">النقل والشحن واللوجستيات</option>
          <option value="السيارات والصيانة وقطع الغيار">السيارات والصيانة وقطع الغيار</option>
          <option value="العيادات والمراكز الطبية">العيادات والمراكز الطبية</option>
          <option value="الصيدليات والرعاية الصحية">الصيدليات والرعاية الصحية</option>
          <option value="التعليم والمدارس والجامعات">التعليم والمدارس والجامعات</option>
          <option value="الخدمات المهنية والاستشارات">الخدمات المهنية والاستشارات</option>
          <option value="التكنولوجيا والبرمجيات">التكنولوجيا والبرمجيات</option>
          <option value="التسويق والإعلان والإعلام">التسويق والإعلان والإعلام</option>
          <option value="خدمات ومكاتب متنوعة">خدمات ومكاتب متنوعة</option>
          <option value="أخرى">أخرى</option>
        </select>
      </label>
      <label>كلمة المرور
        <input name="password" type={showPassword ? "text" : "password"} required minLength={12} maxLength={80} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} />
      </label>
      <button type="button" className="secondary-action" onClick={()=>setPassword(makePassword())}>توليد كلمة مرور قوية</button>
      <button type="button" className="secondary-action" onClick={()=>setShowPassword(value=>!value)}>{showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}</button>
      <button disabled={busy || password.length < 12}>{busy ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب مجانًا"}</button>
    </form>
    {message && <p className="notice notice-error" role="alert">{message}</p>}
    <p className="auth-muted">تقدر تضيف بريد الاسترداد لاحقًا من الإعدادات.</p>
    <p className="auth-muted">لديك حساب؟ <Link href="/login">تسجيل الدخول</Link></p>
  </section></main>;
}
