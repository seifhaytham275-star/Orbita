import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SettingsClient from "./settings-client";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase.from("memberships").select("organization_id").eq("user_id", user.id).limit(1)
  ]);

  const organizationId = memberships?.[0]?.organization_id;
  const { data: organization } = organizationId
    ? await supabase.from("organizations").select("username").eq("id", organizationId).maybeSingle()
    : { data: null };
  const isSyntheticEmail = Boolean(user.email?.endsWith("@users.orbita.invalid"));

  return <main className="dashboard-shell settings-page" dir="rtl">
    <header className="dash-top">
      <Link href="/" className="auth-brand">ORBITA</Link>
      <div className="settings-top-actions">
        <Link href="/dashboard" className="settings-back">العودة إلى لوحة التحكم</Link>
      </div>
    </header>
    <section className="settings-intro">
      <p className="eyebrow">WORKSPACE PREFERENCES</p>
      <h1>الإعدادات</h1>
      <p>تحكم في حسابك ومظهر ORBITA وأمانه من مكان واحد.</p>
    </section>
    <SettingsClient
      initialName={profile?.display_name || ""}
      username={organization?.username || ""}
      initialRecoveryEmail={isSyntheticEmail ? "" : user.email || ""}
    />
  </main>;
}
