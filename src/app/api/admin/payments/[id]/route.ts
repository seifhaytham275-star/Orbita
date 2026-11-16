import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const reviewSchema = z.object({ status: z.enum(["paid", "rejected"]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("platform_role").eq("id", user.id).maybeSingle();
  if (profile?.platform_role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid review status" }, { status: 400 });

  const { id } = await context.params;
  const { data: payment, error } = await supabase.from("payment_submissions")
    .update({ status: parsed.data.status, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", id).in("status", ["pending_review", "pending_provider"])
    .select("id,organization_id,status,method,amount").maybeSingle();

  if (error || !payment) return NextResponse.json({ error: "Payment not found or already reviewed" }, { status: 404 });
  await supabase.from("audit_logs").insert({
    organization_id: payment.organization_id, actor_id: user.id,
    action: parsed.data.status === "paid" ? "payment.approved" : "payment.rejected",
    target_type: "payment_submission", target_id: payment.id,
    metadata: { method: payment.method, amount: payment.amount }
  });
  return NextResponse.json({ payment });
}
