"use client";

import dynamic from "next/dynamic";

/**
 * The charts library (recharts) is large. Loading it separately lets the rest
 * of the dashboard show and respond immediately, with a placeholder where the
 * charts will appear.
 */
export const DashboardCharts = dynamic(
  () => import("./dashboard-charts").then((m) => m.DashboardCharts),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-[380px] animate-pulse rounded-xl border bg-muted/40 lg:col-span-2" />
        <div className="h-[380px] animate-pulse rounded-xl border bg-muted/40" />
      </div>
    ),
  }
);
