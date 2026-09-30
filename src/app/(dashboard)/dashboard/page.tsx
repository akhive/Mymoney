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
  Wallet,
  ArrowLeftRight,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type JoinedAccount = { name?: string; currency?: string } | { name?: string; currency?: string }[] | null;
type JoinedCategory = { name?: string } | { name?: string }[] | null;

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
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.full_name || user.user_metadata?.full_name || "";

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, balance, color, currency")
    .eq("user_id", user.id)
    .eq("is_archived", false);

  const { data: recentTransactions } = await supabase
    .from("transactions")
    .select("id, type, amount, description, date, account:accounts(name, currency), category:categories(name)")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(8);

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

      {/* Accounts List */}
      <Card>
        <CardHeader>
          <CardTitle>Accounts Overview</CardTitle>
          <CardDescription>Balances by account & currency</CardDescription>
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map((a) => (
                <div
                  key={a.id}
                  className="p-4 border rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: a.color }}
                    />
                    <div>
                      <p className="text-sm font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.currency || "USD"}</p>
                    </div>
                  </div>
                  <span className="text-base font-bold">
                    {formatCurrency(Number(a.balance), a.currency || "USD")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent transactions</CardTitle>
            <CardDescription>Your latest activity with dynamic account currencies</CardDescription>
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
              {recentTransactions.map((txn) => {
                const acc = txn.account as JoinedAccount;
                const cat = txn.category as JoinedCategory;

                const accountName = Array.isArray(acc) ? acc[0]?.name : acc?.name;
                const currency = Array.isArray(acc) ? acc[0]?.currency : acc?.currency;
                const categoryName = Array.isArray(cat) ? cat[0]?.name : cat?.name;

                return (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium">
                        {txn.description || "Untitled"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {accountName ?? "Account"} · {categoryName ?? "Uncategorized"} · {formatDate(txn.date)}
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
                      {formatCurrency(Number(txn.amount), currency || "USD")}
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
