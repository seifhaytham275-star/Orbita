import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decryptCredential, encryptCredential } from "@/lib/ai/credentials";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function currentUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await currentUser();
  if (!user) return NextResponse.json({ error: "سجّل الدخول أولًا." }, { status: 401 });
  const { data, error } = await supabase.from("user_ai_credentials").select("encrypted_api_key,key_last_four,updated_at").eq("user_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "تعذر قراءة إعداد Gemini." }, { status: 503 });
  if (data?.encrypted_api_key) {
    try { decryptCredential(data.encrypted_api_key); }
    catch { return NextResponse.json({ error: "تعذر فك تشفير المفتاح المحفوظ. راجع إعدادات الخادم." }, { status: 503 }); }
  }
  return NextResponse.json({ configured: Boolean(data), lastFour: data?.key_last_four ?? null, updatedAt: data?.updated_at ?? null });
}

export async function POST(request: Request) {
  const { supabase, user } = await currentUser();
  if (!user) return NextResponse.json({ error: "سجّل الدخول أولًا." }, { status: 401 });
  const body = await request.json().catch(() => null) as { apiKey?: unknown } | null;
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
  if (apiKey.length < 20 || apiKey.length > 300) return NextResponse.json({ error: "مفتاح Gemini غير صالح." }, { status: 400 });

  const verify = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({ contents: [{ parts: [{ text: "Reply with exactly: OK" }] }], generationConfig: { maxOutputTokens: 8, temperature: 0 } }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000)
  }).catch(() => null);
  if (!verify?.ok) return NextResponse.json({ error: "تعذر التحقق من المفتاح. راجع صحته وصلاحية Gemini API." }, { status: 400 });

  let encrypted: string;
  try { encrypted = encryptCredential(apiKey); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "إعداد التشفير غير مكتمل." }, { status: 503 }); }

  const { error } = await supabase.from("user_ai_credentials").upsert({
    user_id: user.id, provider: "google-gemini", encrypted_api_key: encrypted,
    key_last_four: apiKey.slice(-4), updated_at: new Date().toISOString()
  }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: "تعذر حفظ المفتاح بشكل آمن." }, { status: 503 });
  return NextResponse.json({ success: true, configured: true, lastFour: apiKey.slice(-4) });
}

export async function DELETE() {
  const { supabase, user } = await currentUser();
  if (!user) return NextResponse.json({ error: "سجّل الدخول أولًا." }, { status: 401 });
  const { error } = await supabase.from("user_ai_credentials").delete().eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "تعذر حذف المفتاح." }, { status: 503 });
  return NextResponse.json({ success: true, configured: false });
}
