import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import BillingWorkspace from "../billing-workspace";

export default async function BillingPage() {
  const supabase=await createSupabaseServerClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect("/login");
  const {data:membership}=await supabase.from("memberships").select("organization_id").eq("user_id",user.id).order("created_at").limit(1).maybeSingle();
  return <main className="dashboard-shell"><header className="dash-top"><Link href="/dashboard" className="auth-brand">ORBITA</Link><Link href="/dashboard">العودة للوحة التحكم</Link></header><BillingWorkspace organizationId={membership?.organization_id??null}/></main>;
}
