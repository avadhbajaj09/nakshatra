import { redirect } from "next/navigation";
import { Dashboard } from "@/components/dashboard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role, organization:organizations(name)")
    .eq("user_id", data.claims.sub)
    .maybeSingle();
  if (!membership) redirect("/login?error=no-workspace");

  return (
    <Dashboard
      userEmail={typeof data.claims.email === "string" ? data.claims.email : "Administrator"}
      workspaceName={(membership.organization as unknown as { name?: string } | null)?.name ?? "Nakshatra Hotel & Resort"}
    />
  );
}
