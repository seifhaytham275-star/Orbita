import { redirect } from "next/navigation";
import Link from "next/link";
import AstroWorkspace from "./astro-workspace";
import OperationsWorkspace from "./operations-workspace";
import ApprovalsWorkspace from "./approvals-workspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("display_name,platform_role").eq("id",user.id).maybeSingle(),
    supabase.from("memberships").select("organization_id,role,organizations(name,username,industry,trial_ends_at,subscription_ends_at,subscription_status,features_enabled)").eq("user_id",user.id)
  ]);
  async function signOut() {
    "use server";
    const client = await createSupabaseServerClient();
    await client.auth.signOut();
    redirect("/login");
  }
  const activeOrgId = memberships?.[0]?.organization_id ?? null;
  return <main className="dashboard-shell">
    <header className="dash-top"><Link href="/" className="auth-brand">ORBITA</Link><div className="dash-header-actions"><Link href="/dashboard/settings" className="settings-header-link">الإعدادات</Link><form action={signOut}><button className="signout">تسجيل الخروج</button></form></div></header>
    <section className="dash-welcome"><p className="eyebrow">YOUR WORKSPACE</p><h1>أهلًا {profile?.display_name || user.email}</h1><p>دي مساحة عملك. من هنا تتابع شركتك والمهام التي يوجّهها Astro إلى الوكلاء المتخصصين.</p></section>
    <section className="dash-grid">
      <article><span>نوع الحساب</span><strong>{profile?.platform_role === "admin" ? "مدير المنصة" : "عميل"}</strong></article>
      <article><span>الشركات المرتبطة</span><strong>{memberships?.length ?? 0}</strong></article>
      <article><span>البريد الإلكتروني</span><strong className="email-value">{user.email}</strong></article>
    </section>
    <section className="dash-panel"><h2>شركاتك</h2><p><Link href="/dashboard/billing">إدارة الباقة والدفع عبر InstaPay</Link></p>{memberships?.length ? <ul>{memberships.map((m) => {
      const organization = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
      const accessEndsAt = organization?.subscription_ends_at ?? organization?.trial_ends_at;
      return <li key={m.organization_id}>
        <strong>{organization?.name || "شركة"}</strong> — {m.role}<br/>
        اسم المستخدم: {organization?.username || "سيظهر بعد تطبيق تحديث قاعدة البيانات"}<br/>
        النشاط: {organization?.industry || "غير محدد"}<br/>
        {["active", "trial"].includes(organization?.subscription_status || "") && accessEndsAt
          ? `الوصول حتى ${new Date(accessEndsAt).toLocaleDateString("ar-EG")}`
          : `حالة الحساب: ${organization?.subscription_status || "غير معروفة"}`}<br/>
        {organization?.features_enabled ? "المميزات مفعّلة" : "المميزات موقوفة"}
      </li>;
    })}</ul> : <p>لم تظهر مساحة الشركة المرتبطة بحسابك بعد. حدّث الصفحة بعد لحظات، وإذا استمرت المشكلة تواصل مع الدعم.</p>}</section>
    {profile?.platform_role === "admin" && <p><Link href="/admin">فتح لوحة إدارة الشركات</Link></p>}
    <OperationsWorkspace organizationId={activeOrgId} />
    <AstroWorkspace organizationId={activeOrgId} />
    <ApprovalsWorkspace />
    <p className="dash-note">نسخة تأسيسية: لا تستخدمها لمعالجة مدفوعات أو بيانات عملاء حقيقية قبل استكمال الإعداد واختبارات الأمان.</p>
  </main>;
}
