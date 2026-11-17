import { NextResponse } from "next/server";
import { createAdminDbClient, getAdminSession } from "../../../../lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "يلزم تسجيل دخول الإدارة." }, { status: 401 });
  }

  try {
    const supabase = createAdminDbClient();
    const now = new Date().toISOString();

    const [
      profilesResult,
      organizationsResult,
      paymentsResult,
      pendingPaymentsResult,
      tasksResult,
      plansResult,
      activeSubscriptionsResult,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,email,display_name,platform_role,created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("organizations")
        .select("id,name,industry,created_by,plan_code,subscription_status,features_enabled,subscription_ends_at,trial_ends_at,created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("payment_submissions")
        .select("id,organization_id,user_id,method,amount,currency,customer_reference,status,created_at,plan_code,billing_period_months,admin_note", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("payment_submissions")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending_review", "pending_provider"]),
      supabase
        .from("agent_tasks")
        .select("id,agent_name,title,status,created_at,updated_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("subscription_plans")
        .select("code,name,monthly_price,currency,active,limits,features")
        .order("monthly_price", { ascending: true }),
      supabase
        .from("organizations")
        .select("id", { count: "exact", head: true })
        .in("subscription_status", ["active", "trial"])
        .eq("features_enabled", true)
        .or(`subscription_ends_at.gt.${now},and(subscription_ends_at.is.null,trial_ends_at.gt.${now})`),
    ]);

    const errors = [
      profilesResult.error,
      organizationsResult.error,
      paymentsResult.error,
      pendingPaymentsResult.error,
      tasksResult.error,
      plansResult.error,
      activeSubscriptionsResult.error,
    ].filter(Boolean);

    if (errors.length) {
      return NextResponse.json(
        { error: "تعذر تحميل بيانات لوحة الإدارة. تحقق من اتصال قاعدة البيانات." },
        { status: 503 },
      );
    }

    const profiles = profilesResult.data ?? [];
    const organizations = organizationsResult.data ?? [];
    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
    const organizationById = new Map(organizations.map((organization) => [organization.id, organization]));

    return NextResponse.json(
      {
        stats: {
          accounts: profilesResult.count ?? 0,
          organizations: organizationsResult.count ?? 0,
          activeSubscriptions: activeSubscriptionsResult.count ?? 0,
          payments: paymentsResult.count ?? 0,
          pendingPayments: pendingPaymentsResult.count ?? 0,
          agentTasks: tasksResult.count ?? 0,
        },
        profiles,
        organizations: organizations.map((organization) => ({
          ...organization,
          ownerEmail: profileById.get(organization.created_by)?.email ?? null,
          ownerName: profileById.get(organization.created_by)?.display_name ?? null,
        })),
        payments: (paymentsResult.data ?? []).map((payment) => ({
          ...payment,
          organizationName: organizationById.get(payment.organization_id)?.name ?? "—",
          accountEmail: profileById.get(payment.user_id)?.email ?? null,
        })),
        agentTasks: tasksResult.data ?? [],
        plans: plansResult.data ?? [],
        generatedAt: now,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    return NextResponse.json(
      { error: "إعدادات اتصال لوحة الإدارة غير مكتملة." },
      { status: 503 },
    );
  }
}
