import CreateOrganization from "./create-organization";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("display_name,platform_role").eq("id",user.id).maybeSingle(),
    supabase.from("memberships").select("organization_id,role,organizations(name)").eq("user_id",user.id)
  ]);
  async function signOut() {
    "use server";
    const client = await createSupabaseServerClient();
    await client.auth.signOut();
    redirect("/login");
  }
  return <main className="dashboard-shell">
    <header className="dash-top"><a href="/" className="auth-brand">ORBITA</a><form action={signOut}><button className="signout">تسجيل الخروج</button></form></header>
    <section className="dash-welcome"><p className="eyebrow">YOUR WORKSPACE</p><h1>أهلًا {profile?.display_name || user.email}</h1><p>دي مساحة عملك. تم تجهيز أساس الحسابات وربط الشركات، وسيتم تفعيل أدوات الإدارة بعد إعداد قاعدة البيانات.</p></section>
    <section className="dash-grid">
      <article><span>نوع الحساب</span><strong>{profile?.platform_role === "admin" ? "مدير المنصة" : "عميل"}</strong></article>
      <article><span>الشركات المرتبطة</span><strong>{memberships?.length ?? 0}</strong></article>
      <article><span>البريد الإلكتروني</span><strong className="email-value">{user.email}</strong></article>
    </section>
    <section className="dash-panel"><h2>شركاتك</h2>{memberships?.length ? <ul>{memberships.map((m:any)=><li key={m.organization_id}>{m.organizations?.name || "شركة"} — {m.role}</li>)}</ul> : <p>لا توجد شركة مرتبطة بحسابك حاليًا. إنشاء الشركات وإدارة الأعضاء يحتاجان استكمال إعداد قاعدة البيانات.</p>}</section>
    <CreateOrganization />
    <p className="dash-note">نسخة تأسيسية: لا تستخدمها لمعالجة مدفوعات أو بيانات عملاء حقيقية قبل استكمال الإعداد واختبارات الأمان.</p>
  </main>;
}
