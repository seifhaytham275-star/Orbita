import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminSession } from "@/lib/admin-auth";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server-side admin database access is not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET() {
  try {
    const { data, error } = await getSupabase().rpc("orbita_admin_setup_available");
    if (error) throw error;
    return NextResponse.json({ available: data === true });
  } catch {
    return NextResponse.json({ error: "تعذر التحقق من إعداد الأدمن." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "طلب غير مسموح." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "بيانات الطلب غير صحيحة." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "بيانات غير صحيحة." }, { status: 400 });
  const input = body as { setupCode?: unknown; username?: unknown; password?: unknown; confirmPassword?: unknown };
  if (typeof input.setupCode !== "string" || input.setupCode.length > 200 ||
      typeof input.username !== "string" || !/^[A-Za-z0-9_.-]{3,64}$/.test(input.username) ||
      typeof input.password !== "string" || input.password.length < 12 || input.password.length > 200 ||
      input.confirmPassword !== input.password) {
    return NextResponse.json({ error: "راجع اسم المستخدم وكلمة المرور والتأكيد. كلمة المرور يجب ألا تقل عن 12 حرفًا." }, { status: 400 });
  }
  try {
    const { data, error } = await getSupabase().rpc("orbita_create_first_admin", {
      p_setup_code: input.setupCode,
      p_username: input.username,
      p_password: input.password
    });
    if (error || data !== true) return NextResponse.json({ error: "رمز الإعداد غير صحيح أو تم إنشاء حساب الأدمن بالفعل." }, { status: 409 });
    await createAdminSession(input.username.trim().toLowerCase());
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "تعذر إنشاء حساب الأدمن حاليًا." }, { status: 503 });
  }
}
