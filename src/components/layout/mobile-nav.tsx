"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  PieChart,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/transactions", label: "Txns", icon: ArrowLeftRight },
  { href: "/accounts", label: "Accounts", icon: CreditCard },
  { href: "/budgets", label: "Budgets", icon: PieChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t bg-white">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-xs font-medium transition-colors",
                isActive ? "text-primary" : "text-slate-500"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
