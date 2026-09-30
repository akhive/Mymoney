"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface TopCategory {
  id: string;
  name: string;
  amount: number;
  color: string;
}

interface DashboardChartsProps {
  topCategories: TopCategory[];
  income: number;
  expense: number;
  currency: string;
}

export function DashboardCharts({
  topCategories,
  income,
  expense,
  currency,
}: DashboardChartsProps) {
  const barData = [
    { name: "Income", amount: income, fill: "#10b981" },
    { name: "Expense", amount: expense, fill: "#f43f5e" },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Cashflow Bar Chart */}
      <Card className="order-1 flex flex-col border-slate-200 bg-white shadow-sm transition-colors duration-200 dark:col-span-2 dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-none lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
            Cash Flow Overview
          </CardTitle>
          <CardDescription className="text-[10px] text-slate-500 dark:text-slate-400">
            Monthly income vs expenses breakdown
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-4">
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid
                  stroke="hsl(var(--border))"
                  strokeDasharray="3 3"
                  opacity={0.7}
                />
                <XAxis
                  dataKey="name"
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                />
                <YAxis
                  tickFormatter={(val) =>
                    formatCurrency(val, currency).split(".")[0]
                  }
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--popover-foreground))",
                  }}
                  formatter={(value: number) => [
                    formatCurrency(value, currency),
                    "Total",
                  ]}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Category Pie Chart */}
      <Card className="order-2 flex flex-col border-slate-200 bg-white shadow-sm transition-colors duration-200 dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-none">
        <CardHeader>
          <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
            Expense Breakdown
          </CardTitle>
          <CardDescription className="text-[10px] text-slate-500 dark:text-slate-400">
            Top spending categories
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-4">
          {topCategories.length === 0 ? (
            <div className="flex h-[250px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
              No expense data to display
            </div>
          ) : (
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topCategories}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="amount"
                  >
                    {topCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--popover-foreground))",
                    }}
                    formatter={(value: number) => [
                      formatCurrency(value, currency),
                      "Amount",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
