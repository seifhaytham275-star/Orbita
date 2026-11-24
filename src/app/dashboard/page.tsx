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
      <article><span className="dash-icon" aria-hidden="true">◈</span><div><span>نوع الحساب</span><strong>{profile?.platform_role === "admin" ? "مدير المنصة" : "عميل"}</strong></div></article>
      <article><span className="dash-icon" aria-hidden="true">▦</span><div><span>الشركات المرتبطة</span><strong>{memberships?.length ?? 0}</strong></div></article>
      <article><span className="dash-icon" aria-hidden="true">✉</span><div><span>البريد الإلكتروني</span><strong className="email-value">{user.email}</strong></div></article>
    </section>
    <section className="dash-panel">
      <div className="panel-title-row"><h2>شركاتك</h2><Link href="/dashboard/billing" className="panel-link">إدارة الباقة والدفع عبر InstaPay</Link></div>
      {memberships?.length ? <div className="org-list">{memberships.map((m) => {
        const organization = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
        const accessEndsAt = organization?.subscription_ends_at ?? organization?.trial_ends_at;
        const accessActive = ["active", "trial"].includes(organization?.subscription_status || "") && accessEndsAt;
        return <article className="org-card" key={m.organization_id}>
          <div className="org-card-head">
            <strong>{organization?.name || "شركة"}</strong>
            <span className="org-role">{m.role}</span>
          </div>
          <div className="org-meta">
            <div><b>اسم المستخدم</b><span>{organization?.username || "سيظهر بعد تطبيق تحديث قاعدة البيانات"}</span></div>
            <div><b>النشاط</b><span>{organization?.industry || "غير محدد"}</span></div>
            <div><b>حالة الوصول</b><span>{accessActive
              ? `الوصول حتى ${new Date(accessEndsAt as string).toLocaleDateString("ar-EG")}`
              : `حالة الحساب: ${organization?.subscription_status || "غير معروفة"}`}</span></div>
            <div><b>المميزات</b><span className={organization?.features_enabled ? "org-badge ok" : "org-badge off"}>{organization?.features_enabled ? "المميزات مفعّلة" : "المميزات موقوفة"}</span></div>
          </div>
        </article>;
      })}</div> : <p>لم تظهر مساحة الشركة المرتبطة بحسابك بعد. حدّث الصفحة بعد لحظات، وإذا استمرت المشكلة تواصل مع الدعم.</p>}
    </section>
    {profile?.platform_role === "admin" && <p className="admin-link"><Link href="/admin" className="panel-link">فتح لوحة إدارة الشركات</Link></p>}
    <OperationsWorkspace organizationId={activeOrgId} />
    <AstroWorkspace organizationId={activeOrgId} />
    <ApprovalsWorkspace />
    <p className="dash-note">نسخة تأسيسية: لا تستخدمها لمعالجة مدفوعات أو بيانات عملاء حقيقية قبل استكمال الإعداد واختبارات الأمان.</p>
  </main>;
}
