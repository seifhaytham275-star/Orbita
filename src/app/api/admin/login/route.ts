import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminSession } from "@/lib/admin-auth";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase is not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "طلب غير مسموح." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "بيانات الطلب غير صحيحة." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "بيانات الدخول غير صحيحة." }, { status: 400 });
  const input = body as { username?: unknown; password?: unknown };
  if (typeof input.username !== "string" || typeof input.password !== "string" || input.username.length > 64 || input.password.length > 200) {
    return NextResponse.json({ error: "بيانات الدخول غير صحيحة." }, { status: 400 });
  }
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("orbita_verify_admin_login", {
      p_username: input.username,
      p_password: input.password
    });
    if (error || data !== true) return NextResponse.json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة." }, { status: 401 });
    await createAdminSession(input.username.trim().toLowerCase());
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "تعذر الاتصال بخدمة تسجيل الدخول." }, { status: 503 });
  }
}
