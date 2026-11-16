import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const name = typeof body === "object" && body !== null && "name" in body ? String((body as {name: unknown}).name).trim() : "";
  if (name.length < 2 || name.length > 120) return NextResponse.json({ error: "اسم الشركة يجب أن يكون بين حرفين و120 حرفًا." }, { status: 400 });

  const { data, error } = await supabase.rpc("create_organization", { org_name: name });
  if (error) return NextResponse.json({ error: "تعذر إنشاء الشركة. تأكد من تطبيق migration الخاصة بقاعدة البيانات." }, { status: 400 });
  return NextResponse.json({ organizationId: data }, { status: 201 });
}
