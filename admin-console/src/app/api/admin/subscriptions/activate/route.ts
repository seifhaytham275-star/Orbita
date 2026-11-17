import { NextResponse } from "next/server";
import {
  createAdminDbClient,
  getAdminSession,
  isSameOrigin,
} from "../../../../../lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "يلزم تسجيل دخول الإدارة." }, { status: 401 });
  }
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "طلب غير مسموح." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بيانات الطلب غير صحيحة." }, { status: 400 });
  }

  const input = body as {
    organizationId?: unknown;
    planCode?: unknown;
    months?: unknown;
  };
  const organizationId = typeof input.organizationId === "string" ? input.organizationId : "";
  const planCode = typeof input.planCode === "string" ? input.planCode.trim() : "";
  const months = input.months;

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(organizationId) ||
    !/^[a-zA-Z0-9_-]{1,64}$/.test(planCode) ||
    !Number.isInteger(months) ||
    typeof months !== "number" ||
    months < 1 ||
    months > 12
  ) {
    return NextResponse.json({ error: "راجع العميل والباقة ومدة الاشتراك." }, { status: 400 });
  }

  try {
    const supabase = createAdminDbClient();
    const { data, error } = await supabase.rpc("orbita_admin_set_subscription", {
      p_organization_id: organizationId,
      p_plan_code: planCode,
      p_months: months,
      p_admin_username: session.username,
    });

    if (error) {
      return NextResponse.json(
        { error: "تعذر تفعيل الاشتراك. تأكد من وجود العميل والباقة وأن الباقة مفعّلة." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { ok: true, subscription: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "إعدادات خدمة الاشتراكات غير مكتملة." },
      { status: 503 },
    );
  }
}
