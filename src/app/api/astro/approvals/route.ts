import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getManagerContext(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, userId: string) {
  const { data, error } = await supabase.from("memberships")
    .select("organization_id,role,organizations(name,features_enabled,subscription_status,trial_ends_at)")
    .eq("user_id", userId).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (error || !data || !["owner", "manager"].includes(data.role)) return null;
  const org = Array.isArray(data.organizations) ? data.organizations[0] : data.organizations;
  if (!org || !org.features_enabled || !["active", "trial"].includes(org.subscription_status) || new Date(org.trial_ends_at) < new Date()) return null;
  return { organizationId: data.organization_id, userId };
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "سجّل الدخول أولًا." }, { status: 401 });
  const context = await getManagerContext(supabase, user.id);
  if (!context) return NextResponse.json({ error: "الموافقات متاحة لمالك الشركة أو المدير فقط." }, { status: 403 });
  const { data, error } = await supabase.from("agent_approvals")
    .select("id,task_id,requested_action,payload,status,created_at,decided_at")
    .eq("organization_id", context.organizationId).order("created_at", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: "تعذر تحميل طلبات الموافقة." }, { status: 503 });
  return NextResponse.json({ approvals: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "سجّل الدخول أولًا." }, { status: 401 });
  const context = await getManagerContext(supabase, user.id);
  if (!context) return NextResponse.json({ error: "الموافقات متاحة لمالك الشركة أو المدير فقط." }, { status: 403 });
  const body = await request.json().catch(() => null) as { approvalId?: string; decision?: string } | null;
  if (!body?.approvalId || !["approved", "rejected"].includes(body.decision ?? "")) {
    return NextResponse.json({ error: "بيانات القرار غير مكتملة." }, { status: 400 });
  }
  const { data, error } = await supabase.from("agent_approvals").update({
    status: body.decision, decided_by: user.id, decided_at: new Date().toISOString()
  }).eq("id", body.approvalId).eq("organization_id", context.organizationId).eq("status", "pending")
    .select("id,task_id,status,requested_action").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "الطلب غير موجود أو سبق اتخاذ قرار بشأنه." }, { status: 409 });
  await supabase.from("audit_logs").insert({
    organization_id: context.organizationId, actor_id: user.id, action: "agent.approval_decided",
    target_type: "agent_approval", target_id: data.id, metadata: { decision: body.decision, task_id: data.task_id }
  });
  return NextResponse.json({
    approval: data,
    message: body.decision === "approved"
      ? "تم تسجيل موافقتك. لم يتم تنفيذ الإجراء تلقائيًا؛ التنفيذ الفعلي يعتمد على تكامل الإجراء ومراجعته."
      : "تم رفض الطلب، ولن ينفّذ."
  });
}
