"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Account, Category, Transaction } from "@/types/database";
import { Plus, Pencil, Trash2 } from "lucide-react";

type TxnRow = Transaction & {
  account?: { name?: string } | null;
  category?: { name?: string; color?: string } | null;
};

export default function TransactionsPage() {
  const supabase = createClient();
  const [transactions, setTransactions] = useState<TxnRow[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [editing, setEditing] = useState<TxnRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [txnRes, accRes, catRes, profileRes] = await Promise.all([
      supabase
        .from("transactions")
        .select(
          `id, type, amount, description, date, account_id, category_id,
           account:accounts(name), category:categories(name, color)`
        )
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(100),
      supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_archived", false),
      supabase.from("categories").select("*").eq("user_id", user.id),
      supabase
        .from("profiles")
        .select("preferred_currency")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    if (txnRes.data) setTransactions(txnRes.data as TxnRow[]);
    if (accRes.data) setAccounts(accRes.data);
    if (catRes.data) setCategories(catRes.data);
    if (profileRes.data?.preferred_currency)
      setCurrency(profileRes.data.preferred_currency);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  function openEdit(txn: TxnRow) {
    setEditing(txn);
    setType(txn.type);
    setAmount(String(txn.amount));
    setDescription(txn.description || "");
    setDate(txn.date);
    setAccountId(txn.account_id);
    setCategoryId(txn.category_id || "");
    setError(null);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Enter a valid amount");
      setLoading(false);
      return;
    }

    // Revert effect of old transaction on its account
    const { data: oldAcc } = await supabase
      .from("accounts")
      .select("balance")
      .eq("id", editing.account_id)
      .single();

    if (oldAcc) {
      const reverted =
        editing.type === "income"
          ? Number(oldAcc.balance) - Number(editing.amount)
          : Number(oldAcc.balance) + Number(editing.amount);
      await supabase
        .from("accounts")
        .update({ balance: reverted })
        .eq("id", editing.account_id);
    }

    const { error: updateError } = await supabase
      .from("transactions")
      .update({
        type,
        amount: numAmount,
        description: description || null,
        date,
        account_id: accountId,
        category_id: categoryId || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editing.id)
      .eq("user_id", user.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // Apply new transaction to target account
    const { data: targetAcc } = await supabase
      .from("accounts")
      .select("balance")
      .eq("id", accountId)
      .single();

    if (targetAcc) {
      const applied =
        type === "income"
          ? Number(targetAcc.balance) + numAmount
          : Number(targetAcc.balance) - numAmount;
      await supabase
        .from("accounts")
        .update({ balance: applied })
        .eq("id", accountId);
    }

    setEditing(null);
    setLoading(false);
    load();
  }

  async function handleDelete(txn: TxnRow) {
    if (!confirm("Delete this transaction?")) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Reverse balance
    const account = accounts.find((a) => a.id === txn.account_id);
    if (account) {
      const newBal =
        txn.type === "income"
          ? Number(account.balance) - Number(txn.amount)
          : Number(account.balance) + Number(txn.amount);
      await supabase
        .from("accounts")
        .update({ balance: newBal })
        .eq("id", account.id);
    }

    await supabase
      .from("transactions")
      .delete()
      .eq("id", txn.id)
      .eq("user_id", user.id);

    load();
  }

  const filteredCategories = categories.filter((c) => c.type === type);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Transactions
          </h1>
          <p className="text-muted-foreground">
            View, edit, or delete transactions
          </p>
        </div>
        <Button asChild>
          <Link href="/transactions/new">
            <Plus className="h-4 w-4 mr-2" />
            Add transaction
          </Link>
        </Button>
      </div>

      {editing && (
        <Card>
          <CardHeader>
            <CardTitle>Edit transaction</CardTitle>
          </CardHeader>
          <form onSubmit={handleUpdate}>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={type === "expense" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setType("expense")}
                >
                  Expense
                </Button>
                <Button
                  type="button"
                  variant={type === "income" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setType("income")}
                >
                  Income
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Account</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  required
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Uncategorized</option>
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
          <CardDescription>Latest 100 transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
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
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => (
                    <tr key={txn.id} className="border-b last:border-0">
                      <td className="py-3 whitespace-nowrap">
                        {formatDate(txn.date)}
                      </td>
                      <td className="py-3">{txn.description || "—"}</td>
                      <td className="py-3 hidden sm:table-cell">
                        {txn.category?.name ?? "—"}
                      </td>
                      <td className="py-3 hidden md:table-cell">
                        {txn.account?.name ?? "—"}
                      </td>
                      <td
                        className={`py-3 text-right font-medium ${
                          txn.type === "income"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {txn.type === "income" ? "+" : "-"}
                        {formatCurrency(Number(txn.amount), currency)}
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(txn)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => handleDelete(txn)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
