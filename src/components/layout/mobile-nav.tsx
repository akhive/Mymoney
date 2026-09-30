"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  PieChart,
  BarChart3,
  Settings,
  Users,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/transactions", label: "Txns", icon: ArrowLeftRight },
  { href: "/accounts", label: "Accounts", icon: CreditCard },
  { href: "/budgets", label: "Budgets", icon: PieChart },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/users", label: "Users", icon: Users, superUserOnly: true },
];

export function MobileNav({ isSuperUser }: { isSuperUser: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 overflow-x-auto border-t border-slate-200 bg-white md:hidden dark:border-slate-800/80 dark:bg-slate-900">
      <div className="flex h-16 min-w-max items-center">
        {navItems
          .filter((item) => !item.superUserOnly || isSuperUser)
          .map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-full w-[72px] shrink-0 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors",
                isActive
                  ? "text-indigo-600 dark:text-indigo-300"
                  : "text-slate-500 dark:text-slate-400"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "text-indigo-600 dark:text-indigo-300")} />
              <span>{item.label}</span>
            </Link>
          );
          })}
      </div>
    </nav>
  );
}
