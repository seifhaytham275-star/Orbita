import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");
  const params = await searchParams;
  async function signIn(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const client = await createSupabaseServerClient();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) redirect("/login?message=تعذر%20تسجيل%20الدخول");
    redirect("/dashboard");
  }
  return <main className="auth-shell"><section className="auth-card">
    <a href="/" className="auth-brand">ORBITA</a><p className="eyebrow">WELCOME BACK</p>
    <h1>تسجيل الدخول</h1><p className="auth-muted">ادخل إلى مساحة إدارة شركتك.</p>
    {params.message && <p className="notice">{params.message}</p>}
    <form action={signIn} className="auth-form">
      <label>البريد الإلكتروني<input name="email" type="email" autoComplete="email" required /></label>
      <label>كلمة المرور<input name="password" type="password" autoComplete="current-password" required /></label>
      <button type="submit">دخول إلى Orbita</button>
    </form>
    <p className="auth-muted">ليس لديك حساب؟ <a href="/signup">إنشاء حساب</a></p>
  </section></main>;
}
