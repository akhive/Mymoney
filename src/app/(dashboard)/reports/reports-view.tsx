"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface ReportTransaction {
  date: string;
  type: "income" | "expense";
  amount: number;
}

interface ReportPeriod {
  key: string;
  label: string;
  income: number;
  expense: number;
}

interface ReportsViewProps {
  transactions: ReportTransaction[];
  currency: string;
  currentYear: number;
}

const monthNames = Array.from({ length: 12 }, (_, month) =>
  new Date(2020, month, 1).toLocaleString("default", { month: "short" })
);

export function ReportsView({
  transactions,
  currency,
  currentYear,
}: ReportsViewProps) {
  const [view, setView] = useState<"monthly" | "yearly">("monthly");
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const years = useMemo(() => {
    const transactionYears = transactions.map((transaction) =>
      Number(transaction.date.slice(0, 4))
    );
    return [...new Set([currentYear, ...transactionYears])].sort(
      (a, b) => b - a
    );
  }, [currentYear, transactions]);

  const periods = useMemo<ReportPeriod[]>(() => {
    if (view === "monthly") {
      const months = monthNames.map((label, month) => ({
        key: `${selectedYear}-${String(month + 1).padStart(2, "0")}`,
        label,
        income: 0,
        expense: 0,
      }));

      transactions.forEach((transaction) => {
        const period = months.find(
          (item) => item.key === transaction.date.slice(0, 7)
        );
        if (period) period[transaction.type] += transaction.amount;
      });

      return months;
    }

    const yearlyTotals = new Map<number, ReportPeriod>();
    transactions.forEach((transaction) => {
      const year = Number(transaction.date.slice(0, 4));
      const period = yearlyTotals.get(year) ?? {
        key: String(year),
        label: String(year),
        income: 0,
        expense: 0,
      };
      period[transaction.type] += transaction.amount;
      yearlyTotals.set(year, period);
    });

    if (!yearlyTotals.has(currentYear)) {
      yearlyTotals.set(currentYear, {
        key: String(currentYear),
        label: String(currentYear),
        income: 0,
        expense: 0,
      });
    }

    return [...yearlyTotals.values()].sort(
      (a, b) => Number(a.key) - Number(b.key)
    );
  }, [currentYear, selectedYear, transactions, view]);

  const totals = periods.reduce(
    (result, period) => ({
      income: result.income + period.income,
      expense: result.expense + period.expense,
    }),
    { income: 0, expense: 0 }
  );

  const chartPeriod = view === "monthly" ? "month" : "year";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Reports
          </h1>
          <p className="text-muted-foreground">
            Income and expenses by month or year
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-md border border-border p-1"
            aria-label="Report period"
          >
            {(["monthly", "yearly"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={view === option}
                onClick={() => setView(option)}
                className={`rounded px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                  view === option
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          {view === "monthly" && (
            <select
              aria-label="Report year"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total income</CardDescription>
            <CardTitle className="text-xl text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totals.income, currency)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {view === "monthly" ? selectedYear : "All recorded years"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total expenses</CardDescription>
            <CardTitle className="text-xl text-rose-600 dark:text-rose-400">
              {formatCurrency(totals.expense, currency)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {view === "monthly" ? selectedYear : "All recorded years"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net cash flow</CardDescription>
            <CardTitle
              className={`text-xl ${
                totals.income - totals.expense >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {formatCurrency(totals.income - totals.expense, currency)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Income minus expenses
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Income vs expenses</CardTitle>
          <CardDescription>
            {view === "monthly"
              ? `Monthly totals for ${selectedYear}`
              : "Annual totals across your recorded transactions"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={periods} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid
                  stroke="hsl(var(--border))"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="label"
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={(amount: number) =>
                    formatCurrency(amount, currency).split(".")[0]
                  }
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  width={80}
                />
                <Tooltip
                  labelFormatter={(label) => `${label} ${chartPeriod}`}
                  formatter={(amount: number, name: string) => [
                    formatCurrency(amount, currency),
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    color: "hsl(var(--popover-foreground))",
                  }}
                />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="#10b981"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  dataKey="expense"
                  name="Expenses"
                  fill="#f43f5e"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Period totals</CardTitle>
          <CardDescription>Income, expenses, and net cash flow</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-muted-foreground">
                  <th className="px-3 py-2 font-medium">{view === "monthly" ? "Month" : "Year"}</th>
                  <th className="px-3 py-2 text-right font-medium">Income</th>
                  <th className="px-3 py-2 text-right font-medium">Expenses</th>
                  <th className="px-3 py-2 text-right font-medium">Net</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => (
                  <tr key={period.key} className="border-b last:border-0">
                    <td className="px-3 py-2.5 font-medium">{period.label}</td>
                    <td className="px-3 py-2.5 text-right text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(period.income, currency)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-rose-600 dark:text-rose-400">
                      {formatCurrency(period.expense, currency)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium">
                      {formatCurrency(period.income - period.expense, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}