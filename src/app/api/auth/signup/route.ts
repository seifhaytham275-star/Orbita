import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "بيانات التسجيل غير صالحة." }, { status: 400 }); }

  const input = body as { companyName?: unknown; industry?: unknown; password?: unknown };
  const companyName = typeof input.companyName === "string" ? input.companyName.trim() : "";
  const industry = typeof input.industry === "string" ? input.industry.trim() : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (companyName.length < 2 || companyName.length > 120 || !industry || industry.length > 120) {
    return NextResponse.json({ error: "راجع اسم الشركة ومجال النشاط." }, { status: 400 });
  }
  if (password.length < 12 || password.length > 80) {
    return NextResponse.json({ error: "كلمة المرور يجب أن تكون بين 12 و80 حرفًا." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "إعداد التسجيل غير مكتمل. تواصل مع مسؤول المنصة." }, { status: 503 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const authEmail = `orbita-${crypto.randomUUID()}@users.orbita.invalid`;
  const { data, error } = await admin.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: companyName,
      company_name: companyName,
      industry,
      auth_method: "company_username"
    }
  });

  if (error || !data.user) {
    return NextResponse.json({ error: "تعذر إنشاء الحساب الآن. راجع البيانات وحاول مرة أخرى." }, { status: 400 });
  }

  return NextResponse.json({ authEmail, userId: data.user.id }, { status: 201 });
}
