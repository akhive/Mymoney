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

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_currency, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const currency = profile?.preferred_currency || "USD";
  const displayName =
    profile?.full_name || user.user_metadata?.full_name || "";

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, balance, color, currency")
    .eq("user_id", user.id)
    .eq("is_archived", false);

  const totalBalance =
    accounts?.reduce((sum, a) => sum + Number(a.balance), 0) ?? 0;

  const { data: recentTransactions } = await supabase
    .from("transactions")
    .select("id, type, amount, description, date, category:categories(name)")
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

  const { data: monthTxns } = await supabase
    .from("transactions")
    .select("type, amount, category_id")
    .eq("user_id", user.id)
    .gte("date", startOfMonth);

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

  // Top expense categories this month
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
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const maxCat = topCategories[0]?.amount || 1;

  // Budgets progress
  const { data: budgets } = await supabase
    .from("budgets")
    .select("id, amount, category_id, category:categories(name)")
    .eq("user_id", user.id)
    .eq("month", now.getMonth() + 1)
    .eq("year", now.getFullYear());

  const budgetRows =
    budgets?.map((b) => {
      const spent = catSpend[b.category_id] || 0;
      return {
        id: b.id,
        name: (b.category as { name?: string } | null)?.name || "Category",
        amount: Number(b.amount),
        spent,
      };
    }) ?? [];

  return (
    <div className="space-y-8">
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

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalBalance, currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {accounts?.length || 0} account
              {(accounts?.length || 0) !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Income (this month)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(income, currency)}
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
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(expense, currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {lastExpense > 0
                ? `vs ${formatCurrency(lastExpense, currency)} last month`
                : now.toLocaleString("default", { month: "long" })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net this month</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                net >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(net, currency)}
            </div>
            <p className="text-xs text-muted-foreground">Income − expenses</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Accounts breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Accounts</CardTitle>
            <CardDescription>Balances by account</CardDescription>
          </CardHeader>
          <CardContent>
            {!accounts || accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No accounts yet.{" "}
                <Link href="/accounts" className="text-primary underline">
                  Add one
                </Link>
              </p>
            ) : (
              <div className="space-y-3">
                {accounts.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: a.color }}
                      />
                      <span className="truncate text-sm font-medium">
                        {a.name}
                      </span>
                    </div>
                    <span className="text-sm font-semibold whitespace-nowrap">
                      {formatCurrency(
                        Number(a.balance),
                        a.currency || currency
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top spending */}
        <Card>
          <CardHeader>
            <CardTitle>Top spending</CardTitle>
            <CardDescription>By category this month</CardDescription>
          </CardHeader>
          <CardContent>
            {topCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No expenses categorized yet.
              </p>
            ) : (
              <div className="space-y-3">
                {topCategories.map((c) => (
                  <div key={c.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{c.name}</span>
                      <span>{formatCurrency(c.amount, currency)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full"
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

      {/* Budgets snapshot */}
      {budgetRows.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Budgets this month</CardTitle>
              <CardDescription>Progress vs limits</CardDescription>
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
                  <div key={b.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{b.name}</span>
                      <span className={over ? "text-red-600" : ""}>
                        {formatCurrency(b.spent, currency)} /{" "}
                        {formatCurrency(b.amount, currency)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          over ? "bg-red-500" : "bg-primary"
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

      {/* Recent transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent transactions</CardTitle>
            <CardDescription>Your latest activity</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/transactions">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!recentTransactions || recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No transactions yet.</p>
              <Button variant="link" asChild className="mt-2">
                <Link href="/transactions/new">Add your first transaction</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((txn) => (
                <div
                  key={txn.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">
                      {txn.description || "Untitled"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(txn.category as { name?: string } | null)?.name ??
                        "Uncategorized"}{" "}
                      · {formatDate(txn.date)}
                    </p>
                  </div>
                  <span
                    className={
                      txn.type === "income"
                        ? "font-semibold text-green-600"
                        : "font-semibold text-red-600"
                    }
                  >
                    {txn.type === "income" ? "+" : "-"}
                    {formatCurrency(Number(txn.amount), currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
