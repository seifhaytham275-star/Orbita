import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const paymentSchema = z.object({
  organizationId: z.string().uuid(),
  planCode: z.enum(["pro", "max", "business"]),
  billingPeriodMonths: z.number().int().min(1).max(12).default(1),
  customerReference: z.string().trim().min(3).max(160)
});

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [{ data: plans, error }, { data: memberships }, { data: payments }] = await Promise.all([
    supabase.from("subscription_plans").select("code,name,monthly_price,currency,limits,features").eq("active", true).order("monthly_price"),
    supabase.from("memberships").select("organization_id,role,organizations(name,plan_code,subscription_status,subscription_ends_at,trial_ends_at)").eq("user_id", user.id),
    supabase.from("payment_submissions").select("id,amount,currency,status,plan_code,created_at,customer_reference").eq("user_id", user.id).order("created_at",{ascending:false}).limit(30)
  ]);
  if (error) return NextResponse.json({ error: "تعذر تحميل الباقات." }, { status: 503 });
  const receiver = process.env.INSTAPAY_RECEIVER_IDENTIFIER?.trim() || null;
  return NextResponse.json({
    methods: ["instapay"],
    instapay: { receiverIdentifier: receiver, enabled: Boolean(receiver), confirmation: "manual_owner_review" },
    plans: plans ?? [],
    organizations: memberships ?? [],
    payments: payments ?? []
  });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = paymentSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "راجع الباقة ومرجع التحويل.", details: parsed.error.flatten() }, { status: 400 });

  const { organizationId, planCode, billingPeriodMonths, customerReference } = parsed.data;
  if (!process.env.INSTAPAY_RECEIVER_IDENTIFIER?.trim()) {
    return NextResponse.json({ error: "الدفع عبر InstaPay غير مهيأ حاليًا. تواصل مع إدارة المنصة." }, { status: 503 });
  }
  const [{ data: membership }, { data: plan, error: planError }] = await Promise.all([
    supabase.from("memberships").select("organization_id").eq("organization_id", organizationId).eq("user_id", user.id).maybeSingle(),
    supabase.from("subscription_plans").select("code,monthly_price,currency").eq("code", planCode).eq("active", true).maybeSingle()
  ]);
  if (!membership) return NextResponse.json({ error: "Organization access denied" }, { status: 403 });
  if (planError || !plan) return NextResponse.json({ error: "الباقة غير متاحة حاليًا." }, { status: 404 });

  const amount = Number(plan.monthly_price) * billingPeriodMonths;
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "قيمة الباقة غير صحيحة." }, { status: 400 });

  const { data, error } = await supabase.from("payment_submissions").insert({
    organization_id: organizationId,
    user_id: user.id,
    method: "instapay",
    amount,
    currency: plan.currency || "EGP",
    plan_code: plan.code,
    billing_period_months: billingPeriodMonths,
    customer_reference: customerReference,
    status: "pending_review"
  }).select("id,status,amount,currency,plan_code,billing_period_months,created_at").single();

  if (error) return NextResponse.json({ error: "تعذر تسجيل طلب الدفع. حاول مرة أخرى." }, { status: 400 });
  await supabase.from("audit_logs").insert({
    organization_id: organizationId, actor_id: user.id,
    action: "payment.submitted", target_type: "payment_submission", target_id: data.id,
    metadata: { method: "instapay", amount, currency: data.currency, plan_code: plan.code, billing_period_months: billingPeriodMonths }
  });
  return NextResponse.json({
    payment: data,
    message: "تم تسجيل طلب التحويل. الاشتراك لن يتفعل إلا بعد مراجعة التحويل واعتماده من إدارة Orbita."
  }, { status: 201 });
}
