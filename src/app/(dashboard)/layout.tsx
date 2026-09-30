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
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const userId = claims?.sub;
  const { data: profile } = userId
    ? await supabase
        .from("profiles")
        .select("role, full_name, preferred_currency")
        .eq("id", userId)
        .maybeSingle()
    : { data: null };
  const isSuperUser = profile?.role === "super_user";
  const displayName: string =
    profile?.full_name ||
    (typeof claims?.email === "string" ? claims.email.split("@")[0] : "") ||
    "Account";
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      data-dashboard-shell
      className="dark min-h-screen bg-background text-foreground transition-colors duration-200"
    >
      <DashboardThemeInitializer />
      <Sidebar
        isSuperUser={isSuperUser}
        displayName={displayName}
        initials={initials}
        preferredCurrency={profile?.preferred_currency || "USD"}
      />
      <div className="md:pl-64">
        <main className="min-h-screen p-4 pb-24 md:p-8 md:pb-8">{children}</main>
      </div>
      <MobileNav isSuperUser={isSuperUser} />
    </div>
  );
}
