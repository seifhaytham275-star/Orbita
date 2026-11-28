import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { encryptUserApiKey } from "@/lib/ai/user-openrouter-key";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("سجّل الدخول أولًا.", 401);
  const { data, error } = await supabase.from("user_ai_provider_keys").select("provider,updated_at").eq("user_id", user.id).maybeSingle();
  if (error) return fail("تعذر التحقق من إعداد مفتاح الذكاء الاصطناعي.", 503);
  return NextResponse.json({ configured: Boolean(data), provider: data?.provider ?? null, updatedAt: data?.updated_at ?? null });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("سجّل الدخول أولًا.", 401);
  const body: unknown = await request.json().catch(() => null);
  const key = body && typeof body === "object" && "key" in body ? (body as { key?: unknown }).key : null;
  if (typeof key !== "string" || !key.trim() || key.trim().length > 500 || key.trim().length < 20) return fail("مفتاح OpenRouter غير صالح.");
  const normalized = key.trim();
  if (!normalized.startsWith("sk-or-")) return fail("المفتاح لا يبدو كمفتاح OpenRouter. راجع المفتاح من حسابك.");
  let encrypted;
  try { encrypted = encryptUserApiKey(normalized); }
  catch (error) { return fail(error instanceof Error ? error.message : "تعذر تشفير المفتاح.", 500); }
  const { error } = await supabase.from("user_ai_provider_keys").upsert({
    user_id: user.id, provider: "openrouter", ...encrypted, updated_at: new Date().toISOString()
  }, { onConflict: "user_id" });
  if (error) return fail("تعذر حفظ المفتاح المشفر. تأكد من تطبيق migration الخاصة بمفاتيح العملاء.", 503);
  return NextResponse.json({ saved: true, configured: true });
}

export async function DELETE() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("سجّل الدخول أولًا.", 401);
  const { error } = await supabase.from("user_ai_provider_keys").delete().eq("user_id", user.id);
  if (error) return fail("تعذر حذف مفتاح OpenRouter.", 503);
  return NextResponse.json({ deleted: true, configured: false });
}
