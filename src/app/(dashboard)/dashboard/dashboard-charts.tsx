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
    <div className="grid gap-6 md:grid-cols-2">
      {/* Category Pie Chart */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Expense Distribution</CardTitle>
          <CardDescription>Breakdown by category for this month</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-4">
          {topCategories.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
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

      {/* Cashflow Bar Chart */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Monthly Cash Flow</CardTitle>
          <CardDescription>Income vs. Expense comparison</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-4">
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" />
                <YAxis
                  tickFormatter={(val) =>
                    formatCurrency(val, currency).split(".")[0]
                  }
                />
                <Tooltip
                  formatter={(value: number) => [
                    formatCurrency(value, currency),
                    "Total",
                  ]}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
