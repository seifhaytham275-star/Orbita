import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SubscriptionControls from "./subscription-controls";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("platform_role").eq("id",user.id).maybeSingle();
  if (profile?.platform_role !== "admin") redirect("/dashboard");

  const { data: companies } = await supabase.from("organizations")
    .select("id,name,industry,username,created_by,subscription_status,trial_started_at,trial_ends_at,features_enabled,created_at")
    .order("created_at",{ascending:false});
  const ownerIds = [...new Set((companies || []).map(company=>company.created_by))];
  const { data: owners } = ownerIds.length
    ? await supabase.from("profiles").select("id,email").in("id",ownerIds)
    : { data: [] as {id:string;email:string|null}[] };
  const emailById = new Map((owners || []).map(owner=>[owner.id,owner.email]));
  return <main className="dashboard-shell">
    <header className="dash-top"><a href="/" className="auth-brand">ORBITA</a><a href="/dashboard">لوحة العميل</a></header>
    <section className="dash-welcome"><p className="eyebrow">PLATFORM ADMIN</p><h1>إدارة الشركات</h1><p>راجع حسابات الشركات وحالة الوصول المجاني والمميزات.</p></section>
    <section className="dash-panel">
      <h2>الشركات المسجلة ({companies?.length ?? 0})</h2>
      {!companies?.length ? <p>لا توجد شركات مسجلة حتى الآن.</p> : <div className="admin-company-list">
        {companies.map(company=>{
          const expired = company.subscription_status === "active" && new Date(company.trial_ends_at).getTime() < Date.now();
          return <article className="admin-company" key={company.id}>
            <h3>{company.name}</h3>
            <p>النشاط: {company.industry}</p>
            <p>اسم المستخدم: <strong>{company.username}</strong></p>
            <p>البريد: {emailById.get(company.created_by) || "غير متاح"}</p>
            <p>الوصول المجاني حتى: {new Date(company.trial_ends_at).toLocaleString("ar-EG")}</p>
            {expired && <p className="notice">انتهت مدة الوصول المجاني المحددة؛ راجع الحساب يدويًا قبل تغيير حالته.</p>}
            <SubscriptionControls organizationId={company.id} initialStatus={company.subscription_status} initialFeatures={company.features_enabled}/>
          </article>;
        })}
      </div>}
    </section>
  </main>;
}
