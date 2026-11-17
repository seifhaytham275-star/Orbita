import { NextResponse } from "next/server";
import {
  clearAdminSessionCookie,
  createAdminDbClient,
  getAdminSession,
  isSameOrigin,
  setAdminSessionCookie,
} from "../../../../lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  return NextResponse.json(
    { authenticated: Boolean(session), username: session?.username ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "طلب غير مسموح." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بيانات الدخول غير صحيحة." }, { status: 400 });
  }

  const input = body as { username?: unknown; password?: unknown };
  const username = typeof input.username === "string" ? input.username.trim() : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (
    username.length < 3 ||
    username.length > 64 ||
    !/^[A-Za-z0-9_. -]+$/.test(username) ||
    password.length < 1 ||
    password.length > 200
  ) {
    return NextResponse.json({ error: "راجع اسم المستخدم وكلمة المرور." }, { status: 400 });
  }

  try {
    const supabase = createAdminDbClient();
    const { data, error } = await supabase.rpc("orbita_verify_admin_login", {
      p_username: username,
      p_password: password,
    });

    if (error) {
      return NextResponse.json(
        { error: "تعذر التحقق من بيانات الدخول حاليًا." },
        { status: 503 },
      );
    }

    if (data !== true) {
      return NextResponse.json(
        { error: "اسم المستخدم أو كلمة المرور غير صحيحة، أو تم إيقاف المحاولات مؤقتًا." },
        { status: 401 },
      );
    }

    const normalizedUsername = username.toLowerCase().replace(/\s+/g, " ");
    await setAdminSessionCookie(normalizedUsername);
    return NextResponse.json(
      { authenticated: true, username: normalizedUsername },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "إعدادات لوحة الإدارة غير مكتملة على الخادم." },
      { status: 503 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "طلب غير مسموح." }, { status: 403 });
  }

  await clearAdminSessionCookie();
  return NextResponse.json({ authenticated: false });
}
