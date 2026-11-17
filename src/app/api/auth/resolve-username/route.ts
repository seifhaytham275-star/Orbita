import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بيانات الدخول غير صحيحة." }, { status: 400 });
  }

  const username = body && typeof body === "object" && "username" in body
    ? (body as { username?: unknown }).username
    : undefined;
  if (
    typeof username !== "string" ||
    !username.trim() ||
    username.trim().length > 120 ||
    /[\u0000-\u001f\u007f]/.test(username)
  ) {
    return NextResponse.json({ error: "بيانات الدخول غير صحيحة." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "إعداد تسجيل الدخول غير مكتمل." }, { status: 503 });
  }

  try {
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: company, error: companyError } = await admin
      .from("organizations")
      .select("created_by")
      .eq("username", username.trim().toLowerCase())
      .maybeSingle();

    if (companyError || !company?.created_by) {
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة." }, { status: 401 });
    }

    const { data: owner, error: ownerError } = await admin.auth.admin.getUserById(company.created_by);
    if (ownerError || !owner.user.email) {
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة." }, { status: 401 });
    }

    return NextResponse.json({ email: owner.user.email }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "تعذر تسجيل الدخول حاليًا." }, { status: 503 });
  }
}
