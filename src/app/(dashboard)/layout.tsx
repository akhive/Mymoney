import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  const isSuperUser = profile?.role === "super_user";

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar isSuperUser={isSuperUser} />
      <div className="md:pl-64">
        <main className="p-4 md:p-8 pb-24 md:pb-8">{children}</main>
      </div>
      <MobileNav isSuperUser={isSuperUser} />
    </div>
  );
}
