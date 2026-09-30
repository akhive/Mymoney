import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserManagement } from "./user-management";

export default async function UsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "super_user") redirect("/dashboard");

  return <UserManagement />;
}