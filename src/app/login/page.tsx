import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");
  const params = await searchParams;
  async function signIn(formData: FormData) {
    "use server";
    const identifier = String(formData.get("identifier") || "").trim();
    const password = String(formData.get("password") || "");
    let email = identifier;

    // Company usernames are resolved only on the server with the private service-role key.
    if (!identifier.includes("@")) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !serviceKey) redirect("/login?message=إعداد%20تسجيل%20الدخول%20باسم%20المستخدم%20غير%20مكتمل");
      const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data: company } = await admin.from("organizations").select("created_by").ilike("username", identifier).maybeSingle();
      if (!company?.created_by) redirect("/login?message=بيانات%20الدخول%20غير%20صحيحة");
      const { data: owner, error: ownerError } = await admin.auth.admin.getUserById(company.created_by);
      if (ownerError || !owner.user.email) redirect("/login?message=بيانات%20الدخول%20غير%20صحيحة");
      email = owner.user.email;
    }

    const client = await createSupabaseServerClient();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) redirect("/login?message=بيانات%20الدخول%20غير%20صحيحة");
    redirect("/dashboard");
  }
  return <main className="auth-shell"><section className="auth-card">
    <Link href="/" className="auth-brand">ORBITA</Link><p className="eyebrow">WELCOME BACK</p>
    <h1>تسجيل الدخول</h1><p className="auth-muted">استخدم اسم مستخدم شركتك أو بريدك الإلكتروني.</p>
    {params.message && <p className="notice">{params.message}</p>}
    <form action={signIn} className="auth-form">
      <label>اسم المستخدم أو البريد الإلكتروني<input name="identifier" autoComplete="username" required /></label>
      <label>كلمة المرور<input name="password" type="password" autoComplete="current-password" required /></label>
      <button type="submit">دخول إلى Orbita</button>
    </form>
    <p className="auth-muted">ليس لديك حساب؟ <Link href="/signup">إنشاء حساب</Link></p>
  </section></main>;
}
