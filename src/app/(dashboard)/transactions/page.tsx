"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import {
  Plus,
  Pencil,
  Trash2,
  Download,
  Search,
  ArrowUpDown,
} from "lucide-react";
import * as XLSX from "xlsx";

type TxnRow = Transaction & {
  account?: Account | Account[] | null;
  category?: Category | Category[] | null;
};

export default function TransactionsPage() {
  const supabase = createClient();
  const [transactions, setTransactions] = useState<TxnRow[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<TxnRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State for Editing
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  // Filters & Sorting State
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"date" | "amount" | "description">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [txnRes, accRes, catRes] = await Promise.all([
      supabase
        .from("transactions")
        .select(
          `id, type, amount, description, date, account_id, category_id,
           account:accounts(*), category:categories(*)`
        )
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(200),
      supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_archived", false),
      supabase.from("categories").select("*").eq("user_id", user.id),
    ]);

    if (txnRes.data) setTransactions(txnRes.data as unknown as TxnRow[]);
    if (accRes.data) setAccounts(accRes.data);
    if (catRes.data) setCategories(catRes.data);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  function openEdit(txn: TxnRow) {
    setEditing(txn);
    setType(txn.type as "income" | "expense");
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

  const filteredAndSortedTransactions = useMemo(() => {
    return transactions
      .filter((txn) => {
        const matchesAccount =
          selectedAccount === "all" || txn.account_id === selectedAccount;
        const matchesSearch =
          !searchQuery ||
          (txn.description &&
            txn.description.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesAccount && matchesSearch;
      })
      .sort((a, b) => {
        let valA: string | number = "";
        let valB: string | number = "";

        if (sortField === "date") {
          valA = new Date(a.date).getTime();
          valB = new Date(b.date).getTime();
        } else if (sortField === "amount") {
          valA = Number(a.amount);
          valB = Number(b.amount);
        } else if (sortField === "description") {
          valA = (a.description || "").toLowerCase();
          valB = (b.description || "").toLowerCase();
        }

        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
  }, [transactions, selectedAccount, searchQuery, sortField, sortOrder]);

  function exportToExcel() {
    const exportData = filteredAndSortedTransactions.map((txn) => {
      const acc = Array.isArray(txn.account) ? txn.account[0] : txn.account;
      const cat = Array.isArray(txn.category) ? txn.category[0] : txn.category;
      const accountCurrency = acc?.currency || "USD";

      return {
        Date: formatDate(txn.date),
        Type: txn.type.toUpperCase(),
        Description: txn.description || "-",
        Amount: Number(txn.amount),
        Currency: accountCurrency,
        Formatted_Amount: formatCurrency(Number(txn.amount), accountCurrency),
        Account: acc?.name || "Unknown",
        Category: cat?.name || "Uncategorized",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
    XLSX.writeFile(
      workbook,
      `Transactions_Export_${new Date().toISOString().split("T")[0]}.xlsx`
    );
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
            View, edit, filter, export, or delete transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToExcel}>
            <Download className="h-4 w-4 mr-2" />
            Export (.xlsx)
          </Button>
          <Button asChild>
            <Link href="/transactions/new">
              <Plus className="h-4 w-4 mr-2" />
              Add transaction
            </Link>
          </Button>
        </div>
      </div>

      {/* Edit Transaction Modal / Card */}
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
                      {a.name} ({a.currency || "USD"})
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

      {/* Filter & Controls Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Controls</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label className="text-xs font-medium mb-1 block">Filter by Account</Label>
            <select
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
            >
              <option value="all">All Accounts</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currency || "USD"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs font-medium mb-1 block">Search Description</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-8 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium mb-1 block">Sort By</Label>
            <div className="flex gap-2">
              <select
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={sortField}
                onChange={(e) =>
                  setSortField(e.target.value as "date" | "amount" | "description")
                }
              >
                <option value="date">Date</option>
                <option value="amount">Amount</option>
                <option value="description">Description</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                className="px-3"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
          <CardDescription>
            Showing {filteredAndSortedTransactions.length} transaction(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAndSortedTransactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No transactions found.</p>
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
                  {filteredAndSortedTransactions.map((txn) => {
                    const acc = Array.isArray(txn.account) ? txn.account[0] : txn.account;
                    const cat = Array.isArray(txn.category) ? txn.category[0] : txn.category;
                    const accountCurrency = acc?.currency || "USD";

                    return (
                      <tr key={txn.id} className="border-b last:border-0 hover:bg-slate-50/50">
                        <td className="py-3 whitespace-nowrap">
                          {formatDate(txn.date)}
                        </td>
                        <td className="py-3">{txn.description || "—"}</td>
                        <td className="py-3 hidden sm:table-cell">
                          {cat?.name ?? "—"}
                        </td>
                        <td className="py-3 hidden md:table-cell">
                          {acc?.name ?? "—"}
                        </td>
                        <td
                          className={`py-3 text-right font-medium ${
                            txn.type === "income"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {txn.type === "income" ? "+" : "-"}
                          {formatCurrency(Number(txn.amount), accountCurrency)}
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
