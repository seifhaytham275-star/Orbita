import { redirect } from "next/navigation";
import Link from "next/link";
import LoginForm from "./login-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const LOGIN_ERRORS: Record<string, string> = {
  setup_missing: "إعداد تسجيل الدخول باسم المستخدم غير مكتمل. تواصل مع مسؤول المنصة.",
  invalid_credentials: "بيانات الدخول غير صحيحة.",
  email_confirmation_failed: "تعذر تأكيد البريد الإلكتروني. اطلب رسالة تأكيد جديدة وحاول مرة أخرى."
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  const params = await searchParams;
  const errorMessage = params.error ? LOGIN_ERRORS[params.error] : undefined;

  return <main className="auth-shell"><section className="auth-card">
    <Link href="/" className="auth-brand">ORBITA</Link><p className="eyebrow">WELCOME BACK</p>
    <h1>تسجيل الدخول</h1><p className="auth-muted">استخدم اسم المستخدم الخاص بشركتك لتسجيل الدخول.</p>
    <LoginForm initialError={errorMessage} />
  </section></main>;
}
