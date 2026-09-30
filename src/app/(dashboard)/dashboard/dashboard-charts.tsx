"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Label,
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

interface CashflowPoint {
  key: string;
  name: string;
  income: number;
  expense: number;
}

interface DashboardChartsProps {
  topCategories: TopCategory[];
  cashflowData: CashflowPoint[];
  currency: string;
}

export function DashboardCharts({
  topCategories,
  cashflowData,
  currency,
}: DashboardChartsProps) {
  const pieCategories = topCategories.slice(0, 4);
  const otherAmount = topCategories
    .slice(4)
    .reduce((sum, category) => sum + category.amount, 0);
  if (otherAmount > 0) {
    pieCategories.push({
      id: "other",
      name: "Other",
      amount: otherAmount,
      color: "#64748b",
    });
  }
  const categorizedTotal = topCategories.reduce(
    (sum, category) => sum + category.amount,
    0
  );

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Cashflow Bar Chart */}
      <Card className="order-1 flex flex-col border-slate-200 bg-white shadow-sm transition-colors duration-200 dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-none lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
            Cash Flow Overview
          </CardTitle>
          <CardDescription className="text-[10px] text-slate-500 dark:text-slate-400">
            Monthly income vs expenses breakdown
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-4">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashflowData} margin={{ top: 8, right: 12, left: 4, bottom: 2 }}>
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
                  formatter={(value: number, name: string) => [
                    formatCurrency(value, currency),
                    name,
                  ]}
                  labelStyle={{ color: "hsl(var(--popover-foreground))" }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{
                    color: "hsl(var(--muted-foreground))",
                    fontSize: 11,
                  }}
                />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="expense"
                  name="Expenses"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
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
          {pieCategories.length === 0 ? (
            <div className="flex h-[250px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
              No expense data to display
            </div>
          ) : (
            <div className="flex h-[280px] flex-col">
              <div className="min-h-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieCategories}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={3}
                      dataKey="amount"
                      stroke="hsl(var(--card))"
                      strokeWidth={3}
                    >
                      {pieCategories.map((entry) => (
                        <Cell key={entry.id} fill={entry.color} />
                      ))}
                      <Label
                        value={formatCurrency(categorizedTotal, currency)}
                        position="center"
                        fill="hsl(var(--foreground))"
                        fontSize={12}
                        fontWeight={600}
                      />
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
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-slate-200 pt-2 dark:border-slate-800">
                {pieCategories.map((category) => (
                  <div key={category.id} className="flex min-w-0 items-center gap-1.5 text-[10px]">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="min-w-0 flex-1 truncate text-slate-500 dark:text-slate-400">
                      {category.name}
                    </span>
                    <span className="shrink-0 font-medium text-slate-700 dark:text-slate-200">
                      {formatCurrency(category.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
