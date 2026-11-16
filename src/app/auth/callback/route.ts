import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/dashboard";
  }
  return value;
}

function confirmationFailure(origin: string) {
  // Keep redirect targets ASCII-only; never copy provider-supplied text into headers.
  return NextResponse.redirect(new URL("/login?error=email_confirmation_failed", origin));
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"));

  if (!code) return confirmationFailure(requestUrl.origin);

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return confirmationFailure(requestUrl.origin);
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  } catch {
    return confirmationFailure(requestUrl.origin);
  }
}
