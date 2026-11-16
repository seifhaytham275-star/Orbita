import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { clearAdminSession, getAdminSession } from "@/lib/admin-auth";
import SubscriptionControls from "./subscription-controls";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const adminSession = await getAdminSession();
  if (!adminSession) redirect("/admin/login");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return <main className="dashboard-shell"><header className="dash-top"><Link href="/" className="auth-brand">ORBITA</Link><form action={async()=>{"use server"; await clearAdminSession(); redirect("/admin/login");}}><button className="signout">تسجيل الخروج</button></form></header><section className="dash-panel"><h1>إعداد لوحة الإدارة غير مكتمل</h1><p>تم التحقق من جلسة الأدمن، لكن يلزم إعداد مفتاح الخدمة الخاص بقاعدة البيانات على الخادم لعرض بيانات الشركات. لا تضع هذا المفتاح في كود المتصفح.</p></section></main>;
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: companies, error } = await admin.from("organizations")
    .select("id,name,industry,username,created_by,subscription_status,trial_started_at,trial_ends_at,features_enabled,created_at")
    .order("created_at", { ascending: false });
  const ownerIds = [...new Set((companies || []).map(company => company.created_by).filter(Boolean))];
  const { data: owners } = ownerIds.length
    ? await admin.from("profiles").select("id,email").in("id", ownerIds)
    : { data: [] as { id: string; email: string | null }[] };
  const emailById = new Map((owners || []).map(owner => [owner.id, owner.email]));

  async function signOut() {
    "use server";
    await clearAdminSession();
    redirect("/admin/login");
  }

  return <main className="dashboard-shell">
    <header className="dash-top"><Link href="/" className="auth-brand">ORBITA</Link><div className="admin-top-actions"><span>الأدمن: {adminSession.username}</span><form action={signOut}><button className="signout">تسجيل الخروج</button></form></div></header>
    <section className="dash-welcome"><p className="eyebrow">PRIVATE PLATFORM ADMIN</p><h1>إدارة الشركات</h1><p>لوحة مستقلة عن حسابات العملاء والبريد الإلكتروني.</p></section>
    <section className="dash-panel">
      <h2>الشركات المسجلة ({companies?.length ?? 0})</h2>
      {error ? <p className="notice">تعذر تحميل بيانات الشركات. راجع صلاحية مفتاح الخدمة وإعداد قاعدة البيانات.</p> : !companies?.length ? <p>لا توجد شركات مسجلة حتى الآن.</p> : <div className="admin-company-list">
        {companies.map(company => {
          const expired = company.subscription_status === "active" && new Date(company.trial_ends_at).getTime() < Date.now();
          return <article className="admin-company" key={company.id}>
            <h3>{company.name}</h3>
            <p>النشاط: {company.industry}</p>
            <p>اسم مستخدم الشركة: <strong>{company.username}</strong></p>
            <p>بريد تسجيل العميل: {emailById.get(company.created_by) || "غير متاح"}</p>
            <p>الوصول المجاني حتى: {company.trial_ends_at ? new Date(company.trial_ends_at).toLocaleString("ar-EG") : "غير محدد"}</p>
            {expired && <p className="notice">انتهت مدة الوصول المجاني؛ راجع الحساب يدويًا قبل تغيير حالته.</p>}
            <SubscriptionControls organizationId={company.id} initialStatus={company.subscription_status} initialFeatures={company.features_enabled}/>
          </article>;
        })}
      </div>}
    </section>
  </main>;
}
