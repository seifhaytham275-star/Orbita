import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const paymentSchema = z.object({
  organizationId: z.string().uuid(),
  method: z.enum(["instapay", "fawry"]),
  amount: z.number().positive().max(10_000_000),
  customerReference: z.string().trim().max(160).optional()
});

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const receiver = process.env.INSTAPAY_RECEIVER_IDENTIFIER;
  return NextResponse.json({
    methods: ["instapay", "fawry"],
    instapay: { receiverIdentifier: receiver || null, enabled: Boolean(receiver), confirmation: "manual_owner_review" },
    fawry: { enabled: false, message: "Fawry requires an approved merchant integration and verified callback before activation." }
  });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = paymentSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payment details", details: parsed.error.flatten() }, { status: 400 });

  const { organizationId, method, amount, customerReference } = parsed.data;
  if (method === "fawry") {
    return NextResponse.json({ error: "Fawry is not active yet. It must be connected to an approved merchant account before payment requests can be created." }, { status: 503 });
  }
  const { data: membership } = await supabase.from("memberships").select("organization_id").eq("organization_id", organizationId).eq("user_id", user.id).maybeSingle();
  if (!membership) return NextResponse.json({ error: "Organization access denied" }, { status: 403 });

  const { data, error } = await supabase.from("payment_submissions").insert({
    organization_id: organizationId,
    user_id: user.id,
    method,
    amount,
    customer_reference: customerReference || null,
    status: "pending_review"
  }).select("id,status,created_at").single();

  if (error) return NextResponse.json({ error: "Could not create payment submission" }, { status: 400 });
  await supabase.from("audit_logs").insert({
    organization_id: organizationId, actor_id: user.id,
    action: "payment.submitted", target_type: "payment_submission", target_id: data.id,
    metadata: { method, amount, currency: "EGP" }
  });
  return NextResponse.json({ payment: data, message: "تم تسجيل طلب التحويل وهو قيد مراجعة المالك. لا يعتبر مدفوعًا بعد." }, { status: 201 });
}
