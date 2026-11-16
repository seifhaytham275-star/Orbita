import { NextResponse } from "next/server";
import { createAdminSession, isAdminAuthConfigured, verifyAdminCredentials } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  if (origin && origin !== requestOrigin) return NextResponse.json({ error: "طلب غير مسموح." }, { status: 403 });
  if (!isAdminAuthConfigured()) return NextResponse.json({ error: "إعداد حساب الأدمن لم يكتمل بعد." }, { status: 503 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "بيانات الطلب غير صحيحة." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "بيانات الدخول غير صحيحة." }, { status: 400 });
  const input = body as { username?: unknown; password?: unknown };
  if (typeof input.username !== "string" || typeof input.password !== "string" || input.username.length > 64 || input.password.length > 200) {
    return NextResponse.json({ error: "بيانات الدخول غير صحيحة." }, { status: 400 });
  }
  if (!verifyAdminCredentials(input.username, input.password)) {
    return NextResponse.json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة." }, { status: 401 });
  }
  await createAdminSession();
  return NextResponse.json({ success: true });
}
