import { redirect } from "next/navigation";
import Link from "next/link";
import AstroWorkspace from "./astro-workspace";
import OperationsWorkspace from "./operations-workspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("display_name,platform_role").eq("id",user.id).maybeSingle(),
    supabase.from("memberships").select("organization_id,role,organizations(name,username,industry,trial_ends_at,subscription_status,features_enabled)").eq("user_id",user.id)
  ]);
  async function signOut() {
    "use server";
    const client = await createSupabaseServerClient();
    await client.auth.signOut();
    redirect("/login");
  }
  const activeOrgId = memberships?.[0]?.organization_id ?? null;
  return <main className="dashboard-shell">
    <header className="dash-top"><Link href="/" className="auth-brand">ORBITA</Link><form action={signOut}><button className="signout">تسجيل الخروج</button></form></header>
    <section className="dash-welcome"><p className="eyebrow">YOUR WORKSPACE</p><h1>أهلًا {profile?.display_name || user.email}</h1><p>دي مساحة عملك. من هنا تتابع شركتك والمهام التي يوجّهها Astro إلى الوكلاء المتخصصين.</p></section>
    <section className="dash-grid">
      <article><span>نوع الحساب</span><strong>{profile?.platform_role === "admin" ? "مدير المنصة" : "عميل"}</strong></article>
      <article><span>الشركات المرتبطة</span><strong>{memberships?.length ?? 0}</strong></article>
      <article><span>البريد الإلكتروني</span><strong className="email-value">{user.email}</strong></article>
    </section>
    <section className="dash-panel"><h2>شركاتك</h2>{memberships?.length ? <ul>{memberships.map((m)=><li key={m.organization_id}><strong>{m.organizations?.[0]?.name || "شركة"}</strong> — {m.role}<br/>اسم المستخدم: {m.organizations?.[0]?.username || "سيظهر بعد تطبيق تحديث قاعدة البيانات"}<br/>النشاط: {m.organizations?.[0]?.industry || "غير محدد"}<br/>{m.organizations?.[0]?.subscription_status === "active" ? `وصول مجاني حتى ${new Date(m.organizations[0].trial_ends_at).toLocaleDateString("ar-EG")}` : `حالة الحساب: ${m.organizations?.[0]?.subscription_status}`}<br/>{m.organizations?.[0]?.features_enabled ? "المميزات مفعّلة" : "المميزات موقوفة"}</li>)}</ul> : <p>لا توجد شركة مرتبطة بهذا الحساب. إذا أنشأت حسابك للتو، أكّد بريدك الإلكتروني ثم سجّل الدخول مرة أخرى.</p>}</section>
    {profile?.platform_role === "admin" && <p><Link href="/admin">فتح لوحة إدارة الشركات</Link></p>}
    <OperationsWorkspace organizationId={activeOrgId} />
    <AstroWorkspace organizationId={activeOrgId} />
    <p className="dash-note">نسخة تأسيسية: لا تستخدمها لمعالجة مدفوعات أو بيانات عملاء حقيقية قبل استكمال الإعداد واختبارات الأمان.</p>
  </main>;
}
