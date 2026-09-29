import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: transactions } = await supabase
    .from("transactions")
    .select(
      `
      id,
      type,
      amount,
      description,
      date,
      account:accounts(name),
      category:categories(name, color)
    `
    )
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Transactions
          </h1>
          <p className="text-muted-foreground">
            All your income and expenses
          </p>
        </div>
        <Button asChild>
          <Link href="/transactions/new">
            <Plus className="h-4 w-4 mr-2" />
            Add transaction
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
          <CardDescription>Latest 50 transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {!transactions || transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No transactions yet.</p>
              <Button variant="link" asChild className="mt-2">
                <Link href="/transactions/new">Add your first one</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Description</th>
                    <th className="pb-3 font-medium hidden sm:table-cell">
                      Category
                    </th>
                    <th className="pb-3 font-medium hidden md:table-cell">
                      Account
                    </th>
                    <th className="pb-3 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => (
                    <tr key={txn.id} className="border-b last:border-0">
                      <td className="py-3 whitespace-nowrap">
                        {formatDate(txn.date)}
                      </td>
                      <td className="py-3">
                        {txn.description || "—"}
                      </td>
                      <td className="py-3 hidden sm:table-cell">
                        {(txn.category as { name?: string } | null)?.name ??
                          "—"}
                      </td>
                      <td className="py-3 hidden md:table-cell">
                        {(txn.account as { name?: string } | null)?.name ??
                          "—"}
                      </td>
                      <td
                        className={`py-3 text-right font-medium ${
                          txn.type === "income"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {txn.type === "income" ? "+" : "-"}
                        {formatCurrency(Number(txn.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
