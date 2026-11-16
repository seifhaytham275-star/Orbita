import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminSession } from "@/lib/admin-auth";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const adminSession = await getAdminSession();
  if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid organization id" }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const input = body as { subscription_status?: unknown; features_enabled?: unknown };
  const updates: { subscription_status?: string; features_enabled?: boolean } = {};
  if (input.subscription_status !== undefined) {
    if (!["active", "suspended", "expired"].includes(String(input.subscription_status))) return NextResponse.json({ error: "Invalid account status" }, { status: 400 });
    updates.subscription_status = String(input.subscription_status);
  }
  if (input.features_enabled !== undefined) {
    if (typeof input.features_enabled !== "boolean") return NextResponse.json({ error: "features_enabled must be boolean" }, { status: 400 });
    updates.features_enabled = input.features_enabled;
  }
  if (!Object.keys(updates).length) return NextResponse.json({ error: "No changes supplied" }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "إعداد الإدارة غير مكتمل على الخادم." }, { status: 503 });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.from("organizations").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: "Could not update company access" }, { status: 400 });
  await admin.from("audit_logs").insert({
    actor_id: null, action: "company.access_updated", target_type: "organization",
    target_id: id, metadata: { ...updates, admin_username: adminSession.username }
  });
  return NextResponse.json({ success: true });
}
