import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isSameOrigin } from "../../../../../lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const ADMIN_EMAIL = "seifhaytham275@gmail.com";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "طلب غير مسموح." }, { status: 403 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.json({ error: "إعدادات التحقق بالبريد غير مكتملة." }, { status: 503 });

  try {
    const supabase = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error } = await supabase.auth.signInWithOtp({
      email: ADMIN_EMAIL,
      options: { shouldCreateUser: true },
    });
    if (error) return NextResponse.json({ error: "تعذر إرسال رمز التحقق. تحقق من إعدادات البريد في Supabase." }, { status: 503 });
    return NextResponse.json({ sent: true, message: "إذا كان البريد مهيأً لإرسال الرموز، ستصلك رسالة تحقق." }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "تعذر إرسال رمز التحقق حاليًا." }, { status: 503 });
  }
}
