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

  const input = body as { paymentId?: unknown; decision?: unknown };
  const paymentId = typeof input.paymentId === "string" ? input.paymentId : "";
  const decision = input.decision;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(paymentId) ||
    (decision !== "paid" && decision !== "rejected")
  ) {
    return NextResponse.json({ error: "راجع رقم طلب الدفع والقرار." }, { status: 400 });
  }

  try {
    const supabase = createAdminDbClient();
    const { data: payment, error: paymentError } = await supabase
      .from("payment_submissions")
      .select("id,method,status")
      .eq("id", paymentId)
      .maybeSingle();

    if (paymentError || !payment) {
      return NextResponse.json({ error: "طلب الدفع غير موجود." }, { status: 404 });
    }
    if (payment.method !== "instapay") {
      return NextResponse.json({ error: "طريقة الدفع هذه غير مفعّلة للمراجعة اليدوية." }, { status: 400 });
    }
    if (payment.status !== "pending_review" && payment.status !== "pending_provider") {
      return NextResponse.json({ error: "تمت مراجعة طلب الدفع من قبل." }, { status: 409 });
    }

    const { data, error } = await supabase.rpc("orbita_review_payment", {
      p_payment_id: paymentId,
      p_decision: decision,
      p_admin_username: session.username,
    });

    if (error) {
      return NextResponse.json(
        { error: "تعذر تحديث حالة الدفع. تأكد من مطابقة المبلغ والتحويل قبل الاعتماد." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { ok: true, result: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "إعدادات خدمة المدفوعات غير مكتملة." },
      { status: 503 },
    );
  }
}
