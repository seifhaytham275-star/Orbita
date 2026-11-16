"use client";
import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getPublicSiteUrl } from "@/lib/site-url";

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
          emailRedirectTo: `${getPublicSiteUrl()}/auth/callback?next=%2Fdashboard`
        }
      });
      if (error) throw error;
      setMessage("تم إنشاء حسابك المجاني وبدء تجهيز مساحة شركتك تلقائيًا. لا تحتاج إلى موافقة إدارية أو طلب تفعيل، ولا توجد بطاقة بنكية أو مدفوعات أو تجديد تلقائي. قد يُطلب منك تأكيد بريدك الإلكتروني لتسجيل الدخول.");
    } catch (error) { const reason = error instanceof Error ? error.message : ""; setMessage(reason.toLowerCase().includes("email rate limit exceeded") ? "تم تجاوز الحد المؤقت لإرسال رسائل التحقق. لا تعِد التسجيل الآن. إذا كنت سجلت بهذا البريد من قبل، افحص صندوق الوارد والرسائل غير المرغوب فيها وابحث عن رسالة تأكيد Supabase؛ حسابك قد يكون اتعمل بالفعل. جرّب مرة أخرى بعد انتهاء فترة التحديد." : reason || "تعذر إنشاء الحساب."); }
    finally { setBusy(false); }
  }
  return <main className="auth-shell"><section className="auth-card">
    <Link href="/" className="auth-brand">ORBITA</Link><p className="eyebrow">START YOUR WORKSPACE</p>
    <h1>إنشاء حساب شركتك</h1>
    <p className="auth-muted">أنشئ حسابك فورًا واحصل على شهر مجاني. لا موافقة إدارية، ولا بطاقة بنكية، ولا خصم أو تجديد تلقائي.</p>
    <form onSubmit={submit} className="auth-form">
      <label>اسم الشركة<input name="companyName" required minLength={2} maxLength={120} autoComplete="organization"/></label>
      <label>مجال عمل الشركة
        <select name="industry" required defaultValue="">
          <option value="" disabled>اختر مجال النشاط</option>
          <option value="تجارة التجزئة والمتاجر">تجارة التجزئة والمتاجر</option>
          <option value="التجارة الإلكترونية">التجارة الإلكترونية</option>
          <option value="تجارة الجملة والتوزيع">تجارة الجملة والتوزيع</option>
          <option value="مطاعم وكافيهات ومخابز">مطاعم وكافيهات ومخابز</option>
          <option value="الأغذية والمشروبات">الأغذية والمشروبات</option>
          <option value="السياحة والفنادق والضيافة">السياحة والفنادق والضيافة</option>
          <option value="السفر وشركات السياحة">السفر وشركات السياحة</option>
          <option value="العقارات وإدارة الأملاك">العقارات وإدارة الأملاك</option>
          <option value="المقاولات والبناء والتشطيبات">المقاولات والبناء والتشطيبات</option>
          <option value="التصنيع والإنتاج">التصنيع والإنتاج</option>
          <option value="المخازن وسلاسل الإمداد">المخازن وسلاسل الإمداد</option>
          <option value="النقل والشحن واللوجستيات">النقل والشحن واللوجستيات</option>
          <option value="السيارات والصيانة وقطع الغيار">السيارات والصيانة وقطع الغيار</option>
          <option value="العيادات والمراكز الطبية">العيادات والمراكز الطبية</option>
          <option value="الصيدليات والرعاية الصحية">الصيدليات والرعاية الصحية</option>
          <option value="التعليم والمدارس والجامعات">التعليم والمدارس والجامعات</option>
          <option value="التدريب والكورسات">التدريب والكورسات</option>
          <option value="الخدمات المهنية والاستشارات">الخدمات المهنية والاستشارات</option>
          <option value="المحاماة والخدمات القانونية">المحاماة والخدمات القانونية</option>
          <option value="المحاسبة والمراجعة والضرائب">المحاسبة والمراجعة والضرائب</option>
          <option value="التكنولوجيا والبرمجيات">التكنولوجيا والبرمجيات</option>
          <option value="التسويق والإعلان والإعلام">التسويق والإعلان والإعلام</option>
          <option value="التصميم والإبداع والإنتاج الفني">التصميم والإبداع والإنتاج الفني</option>
          <option value="الصالونات والتجميل والعناية الشخصية">الصالونات والتجميل والعناية الشخصية</option>
          <option value="الرياضة واللياقة البدنية">الرياضة واللياقة البدنية</option>
          <option value="الزراعة والثروة الحيوانية">الزراعة والثروة الحيوانية</option>
          <option value="الطاقة والمرافق">الطاقة والمرافق</option>
          <option value="الجمعيات والمؤسسات غير الربحية">الجمعيات والمؤسسات غير الربحية</option>
          <option value="الخدمات المنزلية والصيانة">الخدمات المنزلية والصيانة</option>
          <option value="خدمات ومكاتب متنوعة">خدمات ومكاتب متنوعة</option>
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
