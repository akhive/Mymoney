import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { DashboardThemeInitializer } from "@/components/layout/dashboard-theme";
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
    <div
      data-dashboard-shell
      className="dark min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100"
    >
      <DashboardThemeInitializer />
      <Sidebar isSuperUser={isSuperUser} />
      <div className="md:pl-64">
        <main className="min-h-screen p-4 pb-24 md:p-8 md:pb-8">{children}</main>
      </div>
      <MobileNav isSuperUser={isSuperUser} />
    </div>
  );
}
