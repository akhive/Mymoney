"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Account, Category, TransactionType } from "@/types/database";

export default function NewTransactionPage() {
  const router = useRouter();
  const supabase = createClient();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const [accRes, catRes] = await Promise.all([
        supabase
          .from("accounts")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_archived", false)
          .order("name"),
        supabase
          .from("categories")
          .select("*")
          .eq("user_id", user.id)
          .order("name"),
      ]);

      if (accRes.data) {
        setAccounts(accRes.data);
        if (accRes.data.length > 0) setAccountId(accRes.data[0].id);
        if (accRes.data.length > 1) setToAccountId(accRes.data[1].id);
      }
      if (catRes.data) setCategories(catRes.data);
    }
    load();
  }, [supabase]);

  const filteredCategories =
    type === "transfer" ? [] : categories.filter((c) => c.type === type);
  const sourceAccount = accounts.find((account) => account.id === accountId);
  const destinationAccount = accounts.find(
    (account) => account.id === toAccountId
  );
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      setError("Please enter a valid amount");
      setLoading(false);
      return;
    }

    if (type === "transfer") {
      const receivedAmount = parseFloat(toAmount);
      if (
        !toAccountId ||
        toAccountId === accountId ||
        isNaN(receivedAmount) ||
        receivedAmount <= 0
      ) {
        setError("Choose a different destination account and enter its received amount");
        setLoading(false);
        return;
      }

      const { error: transferError } = await supabase.rpc(
        "save_account_transfer",
        {
          p_transaction_id: null,
          p_from_account_id: accountId,
          p_to_account_id: toAccountId,
          p_amount: numAmount,
          p_to_amount: receivedAmount,
          p_description: description || null,
          p_date: date,
          p_delete: false,
        }
      );

      if (transferError) {
        setError(transferError.message);
        setLoading(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from("transactions").insert({
        user_id: user.id,
        account_id: accountId,
        category_id: categoryId || null,
        type,
        amount: numAmount,
        description: description || null,
        date,
      });

      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }

      if (sourceAccount) {
        const newBalance =
          type === "income"
            ? Number(sourceAccount.balance) + numAmount
            : Number(sourceAccount.balance) - numAmount;

        await supabase
          .from("accounts")
          .update({ balance: newBalance })
          .eq("id", accountId);
      }
    }

    router.push("/transactions");
    router.refresh();
  }

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Add transaction</CardTitle>
          <CardDescription>
            Record income, an expense, or a transfer between accounts
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
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
                onClick={() => {
                  setType("expense");
                  setCategoryId("");
                }}
              >
                Expense
              </Button>
              <Button
                type="button"
                variant={type === "income" ? "default" : "outline"}
                className="flex-1"
                onClick={() => {
                  setType("income");
                  setCategoryId("");
                }}
              >
                Income
              </Button>
              <Button
                type="button"
                variant={type === "transfer" ? "default" : "outline"}
                className="flex-1"
                onClick={() => {
                  setType("transfer");
                  setCategoryId("");
                  setToAmount("");
                }}
              >
                Transfer
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">
                {type === "transfer" ? "Amount sent" : "Amount"}
                {type === "transfer" && sourceAccount
                  ? ` (${sourceAccount.currency})`
                  : ""}
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="e.g. Grocery shopping"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account">
                {type === "transfer" ? "From account" : "Account"}
              </Label>
              <select
                id="account"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={accountId}
                onChange={(e) => {
                  setAccountId(e.target.value);
                  if (e.target.value === toAccountId) {
                    setToAccountId(
                      accounts.find((account) => account.id !== e.target.value)
                        ?.id || ""
                    );
                  }
                }}
                required
              >
                {accounts.length === 0 && (
                  <option value="">No accounts yet — create one first</option>
                )}
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {type === "transfer" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="toAccount">To account</Label>
                  <select
                    id="toAccount"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    required
                  >
                    <option value="">Select destination account</option>
                    {accounts
                      .filter((account) => account.id !== accountId)
                      .map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.currency})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toAmount">
                    Amount received
                    {destinationAccount ? ` (${destinationAccount.currency})` : ""}
                  </Label>
                  <Input
                    id="toAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Enter amount credited"
                    value={toAmount}
                    onChange={(e) => setToAmount(e.target.value)}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Record the exact amount credited by the receiving account. Any transfer fee should be a separate expense.
                </p>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="category">Category (optional)</Label>
                <select
                  id="category"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
            )}
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || !accountId}>
              {loading ? "Saving..." : "Save transaction"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
