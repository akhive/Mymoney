"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const themeStorageKey = "my-money-dashboard-theme";

function setDashboardTheme(isDark: boolean) {
  document
    .querySelector<HTMLElement>("[data-dashboard-shell]")
    ?.classList.toggle("dark", isDark);
}

export function DashboardThemeInitializer() {
  useEffect(() => {
    const savedTheme = window.localStorage.getItem(themeStorageKey);
    setDashboardTheme(savedTheme !== "light");
  }, []);

  return null;
}

export function DashboardThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const dark = window.localStorage.getItem(themeStorageKey) !== "light";
    setIsDark(dark);
    setDashboardTheme(dark);
  }, []);

  function toggleTheme() {
    const nextIsDark = !isDark;
    setIsDark(nextIsDark);
    setDashboardTheme(nextIsDark);
    window.localStorage.setItem(themeStorageKey, nextIsDark ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-500" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4 text-indigo-600" aria-hidden="true" />
      )}
      {isDark ? "Light" : "Dark"}
    </button>
  );
}