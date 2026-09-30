import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowLeftRight,
  PiggyBank,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DashboardCharts } from "./dashboard-charts";

type JoinedAccount =
  | { name?: string }
  | { name?: string }[]
  | null;

type JoinedCategory = { name?: string } | { name?: string }[] | null;

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user profile for preferred currency
  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_currency, full_name")
    .eq("id", user.id)
    .maybeSingle();

  // Primary currency fallback
  const preferredCurrency = profile?.preferred_currency || "USD";
  const displayName =
    profile?.full_name || user.user_metadata?.full_name || "";

  // Fetch active accounts
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, balance, color")
    .eq("user_id", user.id)
    .eq("is_archived", false);

  const totalBalance =
    accounts?.reduce((sum, a) => sum + Number(a.balance), 0) ?? 0;

  // Fetch recent transactions with account & category details
  const { data: recentTransactions } = await supabase
    .from("transactions")
    .select(
      "id, type, amount, description, date, account:accounts(name), category:categories(name)"
    )
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(8);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toISOString()
    .split("T")[0];
  const endOfLastMonth = startOfMonth;

  // Fetch current month transactions
  const { data: monthTxns } = await supabase
    .from("transactions")
    .select("type, amount, category_id")
    .eq("user_id", user.id)
    .gte("date", startOfMonth);

  // Fetch last month transactions
  const { data: lastMonthTxns } = await supabase
    .from("transactions")
    .select("type, amount")
    .eq("user_id", user.id)
    .gte("date", startOfLastMonth)
    .lt("date", endOfLastMonth);

  const income =
    monthTxns
      ?.filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;
  const expense =
    monthTxns
      ?.filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;
  const net = income - expense;

  const lastExpense =
    lastMonthTxns
      ?.filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;

  // Calculate Category Spend Breakdown
  const catSpend: Record<string, number> = {};
  monthTxns
    ?.filter((t) => t.type === "expense" && t.category_id)
    .forEach((t) => {
      catSpend[t.category_id!] =
        (catSpend[t.category_id!] || 0) + Number(t.amount);
    });

  const { data: cats } = await supabase
    .from("categories")
    .select("id, name, color")
    .eq("user_id", user.id)
    .eq("type", "expense");

  const topCategories = Object.entries(catSpend)
    .map(([id, amt]) => ({
      id,
      amount: amt,
      name: cats?.find((c) => c.id === id)?.name || "Other",
      color: cats?.find((c) => c.id === id)?.color || "#64748b",
    }))
    .sort((a, b) => b.amount - a.amount);

  const maxCat = topCategories[0]?.amount || 1;

  // Fetch Budgets Snapshot
  const { data: budgets } = await supabase
    .from("budgets")
    .select("id, amount, category_id, category:categories(name)")
    .eq("user_id", user.id)
    .eq("month", now.getMonth() + 1)
    .eq("year", now.getFullYear());

  const budgetRows =
    budgets?.map((b) => {
      const spent = catSpend[b.category_id] || 0;
      const cat = b.category as JoinedCategory;
      const categoryName = Array.isArray(cat) ? cat[0]?.name : cat?.name;

      return {
        id: b.id,
        name: categoryName || "Category",
        amount: Number(b.amount),
        spent,
      };
    }) ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back{displayName ? `, ${displayName}` : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/transactions/new">
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            Add transaction
          </Link>
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalBalance, preferredCurrency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {accounts?.length || 0} active account
              {(accounts?.length || 0) !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Income (this month)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(income, preferredCurrency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {now.toLocaleString("default", { month: "long" })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Expenses (this month)
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              {formatCurrency(expense, preferredCurrency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {lastExpense > 0
                ? `vs ${formatCurrency(lastExpense, preferredCurrency)} last month`
                : now.toLocaleString("default", { month: "long" })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Growth</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                net >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {formatCurrency(net, preferredCurrency)}
            </div>
            <p className="text-xs text-muted-foreground">Income − expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Pie & Bar Charts */}
      <DashboardCharts
        topCategories={topCategories}
        income={income}
        expense={expense}
        currency={preferredCurrency}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Accounts Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Accounts Summary</CardTitle>
            <CardDescription>Balances per individual account</CardDescription>
          </CardHeader>
          <CardContent>
            {!accounts || accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No accounts found.{" "}
                <Link href="/accounts" className="text-primary underline">
                  Add an account
                </Link>
              </p>
            ) : (
              <div className="space-y-3">
                {accounts.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: a.color || "#64748b" }}
                      />
                      <span className="truncate text-sm font-medium">
                        {a.name}
                      </span>
                    </div>
                    <span className="text-sm font-semibold whitespace-nowrap">
                      {formatCurrency(Number(a.balance), preferredCurrency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Expense Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Top Spending Breakdown</CardTitle>
            <CardDescription>Highest expenditure categories</CardDescription>
          </CardHeader>
          <CardContent>
            {topCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No categorized expenses this month.
              </p>
            ) : (
              <div className="space-y-4">
                {topCategories.slice(0, 5).map((c) => (
                  <div key={c.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{c.name}</span>
                      <span>{formatCurrency(c.amount, preferredCurrency)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(c.amount / maxCat) * 100}%`,
                          backgroundColor: c.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Budgets Progress */}
      {budgetRows.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Budget Limits</CardTitle>
              <CardDescription>Current month tracking</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/budgets">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {budgetRows.map((b) => {
                const pct = Math.min(100, (b.spent / b.amount) * 100);
                const over = b.spent > b.amount;
                return (
                  <div key={b.id} className="space-y-1 p-3 border rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{b.name}</span>
                      <span className={over ? "text-rose-600 font-bold" : ""}>
                        {formatCurrency(b.spent, preferredCurrency)} /{" "}
                        {formatCurrency(b.amount, preferredCurrency)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          over ? "bg-rose-500" : "bg-primary"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest transactions recorded</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/transactions">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!recentTransactions || recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No recent activity found.</p>
              <Button variant="link" asChild className="mt-2">
                <Link href="/transactions/new">Create a transaction</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((txn) => {
                const acc = txn.account as JoinedAccount;
                const cat = txn.category as JoinedCategory;

                const accountName = Array.isArray(acc) ? acc[0]?.name : acc?.name;
                const categoryName = Array.isArray(cat)
                  ? cat[0]?.name
                  : cat?.name;

                return (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {txn.description || "Untitled"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {accountName ? `${accountName} · ` : ""}
                        {categoryName ?? "Uncategorized"} · {formatDate(txn.date)}
                      </p>
                    </div>
                    <span
                      className={
                        txn.type === "income"
                          ? "font-semibold text-emerald-600"
                          : "font-semibold text-rose-600"
                      }
                    >
                      {txn.type === "income" ? "+" : "-"}
                      {formatCurrency(Number(txn.amount), preferredCurrency)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
