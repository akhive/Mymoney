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
import { CreditCard, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  matchAccount,
  readTapPaymentParams,
  type TapPaymentParams,
} from "@/lib/tap-payment";

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
  const [tapPayment, setTapPayment] = useState<TapPaymentParams | null>(null);
  const [showTapPrompt, setShowTapPrompt] = useState(false);

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

      // iPhone tap-to-pay: prefill from the Shortcuts automation link.
      const tap = readTapPaymentParams(window.location.search);
      if (tap) {
        setTapPayment(tap);
        setType("expense");
        if (tap.amount) setAmount(tap.amount);
        if (tap.merchant) setDescription(tap.merchant);

        const matched = matchAccount(accRes.data ?? [], tap.card);
        if (matched) setAccountId(matched.id);

        // Reuse the category from the last expense at the same merchant.
        if (tap.merchant) {
          const { data: previous } = await supabase
            .from("transactions")
            .select("category_id")
            .eq("user_id", user.id)
            .eq("type", "expense")
            .ilike("description", tap.merchant)
            .not("category_id", "is", null)
            .order("date", { ascending: false })
            .limit(1);
          if (previous?.[0]?.category_id) {
            setCategoryId(previous[0].category_id);
          }
        }

        setShowTapPrompt(true);
      }
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
    await saveTransaction();
  }

  async function saveTransaction() {
    setShowTapPrompt(false);
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

  const tapCategory = categories.find((c) => c.id === categoryId);

  return (
    <div className="max-w-lg mx-auto">
      {showTapPrompt && tapPayment && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tap-prompt-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-background p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <CreditCard className="h-5 w-5" />
                </span>
                <div>
                  <h2 id="tap-prompt-title" className="font-semibold">
                    Record this tap payment?
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Detected from your iPhone Wallet
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setShowTapPrompt(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 rounded-xl border p-4 text-center">
              <div className="text-3xl font-bold">
                {amount
                  ? formatCurrency(
                      Number(amount),
                      sourceAccount?.currency || "USD"
                    )
                  : "Amount not detected"}
              </div>
              {tapPayment.merchant && (
                <div className="mt-1 font-medium">{tapPayment.merchant}</div>
              )}
              <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                <div>Account: {sourceAccount?.name || "—"}</div>
                <div>Category: {tapCategory?.name || "Uncategorized"}</div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                className="w-full"
                disabled={loading || !accountId || !amount}
                onClick={() => saveTransaction()}
              >
                Record as expense
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setShowTapPrompt(false)}
              >
                Edit details first
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => router.push("/transactions")}
              >
                Don&apos;t record
              </Button>
            </div>
          </div>
        </div>
      )}
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
