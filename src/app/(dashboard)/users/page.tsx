import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserManagement } from "./user-management";

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const userId = claims?.sub;

  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.role !== "super_user") redirect("/dashboard");

  return <UserManagement />;
}