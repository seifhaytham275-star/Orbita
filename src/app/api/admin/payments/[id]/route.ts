import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { getAdminSession } from "@/lib/admin-auth";

const reviewSchema = z.object({ status: z.enum(["paid", "rejected"]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const adminSession = await getAdminSession();
  if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid review status" }, { status: 400 });

  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid payment id" }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "إعداد الإدارة غير مكتمل على الخادم." }, { status: 503 });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: payment, error } = await admin.from("payment_submissions")
    .update({ status: parsed.data.status, reviewed_by: null, reviewed_at: new Date().toISOString() })
    .eq("id", id).in("status", ["pending_review", "pending_provider"])
    .select("id,organization_id,status,method,amount").maybeSingle();

  if (error || !payment) return NextResponse.json({ error: "Payment not found or already reviewed" }, { status: 404 });
  await admin.from("audit_logs").insert({
    organization_id: payment.organization_id, actor_id: null,
    action: parsed.data.status === "paid" ? "payment.approved" : "payment.rejected",
    target_type: "payment_submission", target_id: payment.id,
    metadata: { method: payment.method, amount: payment.amount, admin_username: adminSession.username }
  });
  return NextResponse.json({ payment });
}
