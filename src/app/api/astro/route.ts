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

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "سجّل الدخول أولًا." }, { status: 401 });

  const body = await request.json().catch(() => null) as { message?: string } | null;
  const message = body?.message?.trim();
  if (!message || message.length > 1200) return NextResponse.json({ error: "اكتب مهمة واضحة (حتى 1200 حرف)." }, { status: 400 });

  const { data: membership } = await supabase.from("memberships")
    .select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membership?.organization_id) return NextResponse.json({ error: "لا توجد شركة مرتبطة بحسابك." }, { status: 403 });

  const normalized = message.toLocaleLowerCase("ar");
  const selected = routing.find(item => item.keywords.some(keyword => normalized.includes(keyword)));
  const agent = selected?.agent ?? "Insight";
  const title = message.slice(0, 180);

  const { data: task, error } = await supabase.from("agent_tasks").insert({
    organization_id: membership.organization_id,
    requested_by: user.id,
    agent_name: agent,
    title,
    input: { message },
    status: "queued"
  }).select("id,agent_name,title,status,created_at").single();

  if (error) return NextResponse.json({ error: "تعذر تسجيل المهمة. تأكد من تطبيق تحديث قاعدة البيانات." }, { status: 503 });

  await supabase.from("audit_logs").insert({
    organization_id: membership.organization_id,
    actor_id: user.id,
    action: "astro.task_routed",
    target_type: "agent_task",
    target_id: task.id,
    metadata: { agent_name: agent }
  });

  return NextResponse.json({
    task,
    reply: `فهمت طلبك. وجّهت المهمة إلى Orbita ${agent} وسجّلتها في قائمة المهام. حالتها الآن "بانتظار التنفيذ"؛ لن أقول إنها اكتملت قبل تنفيذها والتحقق من نتيجتها.`
  });
}
