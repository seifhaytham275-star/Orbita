import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const routing: Array<{ agent: string; keywords: string[] }> = [
  { agent: "Ledger", keywords: ["فاتورة", "حساب", "مبيعات", "مصروف", "عميل", "invoice", "account", "sales"] },
  { agent: "Echo", keywords: ["عميل", "رسالة", "طلب", "واتساب", "خدمة العملاء", "customer", "order", "whatsapp"] },
  { agent: "Pulse", keywords: ["حجز", "موعد", "تذكير", "اشتراك", "booking", "appointment", "reminder"] },
  { agent: "Stock", keywords: ["مخزون", "صنف", "منتج", "شراء", "كمية", "stock", "inventory", "product"] },
  { agent: "Reach", keywords: ["تسويق", "إعلان", "منشور", "محتوى", "حملة", "marketing", "content", "campaign"] },
  { agent: "Insight", keywords: ["تقرير", "تحليل", "ملخص", "أداء", "إحصائيات", "report", "analytics", "summary"] }
];

async function getOrganizationId(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, userId: string) {
  const { data } = await supabase.from("memberships").select("organization_id").eq("user_id", userId).limit(1).maybeSingle();
  return data?.organization_id ?? null;
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "سجّل الدخول أولًا." }, { status: 401 });
  const organizationId = await getOrganizationId(supabase, user.id);
  if (!organizationId) return NextResponse.json({ error: "لا توجد شركة مرتبطة بحسابك." }, { status: 403 });
  const { data: tasks, error } = await supabase.from("agent_tasks").select("id,agent_name,title,status,created_at")
    .eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(25);
  if (error) return NextResponse.json({ error: "تعذر تحميل سجل المهام." }, { status: 503 });
  return NextResponse.json({ tasks: tasks ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "سجّل الدخول أولًا." }, { status: 401 });
  const body = await request.json().catch(() => null) as { message?: string } | null;
  const message = body?.message?.trim();
  if (!message || message.length > 1200) return NextResponse.json({ error: "اكتب مهمة واضحة (حتى 1200 حرف)." }, { status: 400 });
  const organizationId = await getOrganizationId(supabase, user.id);
  if (!organizationId) return NextResponse.json({ error: "لا توجد شركة مرتبطة بحسابك." }, { status: 403 });
  const normalized = message.toLocaleLowerCase("ar");
  const selected = routing.find(item => item.keywords.some(keyword => normalized.includes(keyword)));
  const agent = selected?.agent ?? "Insight";
  const { data: task, error } = await supabase.from("agent_tasks").insert({
    organization_id: organizationId, requested_by: user.id, agent_name: agent,
    title: message.slice(0, 180), input: { message }, status: "queued"
  }).select("id,agent_name,title,status,created_at").single();
  if (error) return NextResponse.json({ error: "تعذر تسجيل المهمة. تأكد من إعداد صلاحيات قاعدة البيانات." }, { status: 503 });
  await supabase.from("audit_logs").insert({
    organization_id: organizationId, actor_id: user.id, action: "astro.task_routed",
    target_type: "agent_task", target_id: task.id, metadata: { agent_name: agent }
  });
  return NextResponse.json({ task, reply: `فهمت طلبك. وجّهت المهمة إلى Orbita ${agent} وسجّلتها في قائمة المهام. حالتها الآن "بانتظار التنفيذ"؛ الوكيل لم ينفّذها بعد.` });
}
