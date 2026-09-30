"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Account, Category } from "@/types/database";
import Link from "next/link";
import { Plus, Download, ArrowUpDown, Trash2, Search } from "lucide-react";
import * as XLSX from "xlsx";

type TransactionExtended = {
  id: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  description: string | null;
  date: string;
  account_id: string;
  category_id: string | null;
  account?: Account | Account[] | null;
  category?: Category | Category[] | null;
};

export default function TransactionsPage() {
  const supabase = createClient();
  const [transactions, setTransactions] = useState<TransactionExtended[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"date" | "amount" | "description">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [accRes, txnRes] = await Promise.all([
      supabase.from("accounts").select("*").eq("user_id", user.id),
      supabase
        .from("transactions")
        .select("*, account:accounts(*), category:categories(*)")
        .eq("user_id", user.id),
    ]);

    if (accRes.data) setAccounts(accRes.data);
    if (txnRes.data) {
      setTransactions(txnRes.data as unknown as TransactionExtended[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id);
    loadData();
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
      const currency = acc?.currency || "USD";

      return {
        Date: formatDate(txn.date),
        Type: txn.type.toUpperCase(),
        Description: txn.description || "-",
        Amount: Number(txn.amount),
        Currency: currency,
        Formatted_Amount: formatCurrency(Number(txn.amount), currency),
        Account: acc?.name || "Unknown",
        Category: cat?.name || "Uncategorized",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
    XLSX.writeFile(workbook, `Transactions_Export_${new Date().toISOString().split("T")[0]}.xlsx`);
  }

  function toggleSort(field: "date" | "amount" | "description") {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">Manage and track all your financial transactions</p>
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

      <Card>
        <CardHeader>
          <CardTitle>Filters & Controls</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium mb-1 block">Filter by Account</label>
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
            <label className="text-xs font-medium mb-1 block">Search Description</label>
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
            <label className="text-xs font-medium mb-1 block">Sort By</label>
            <div className="flex gap-2">
              <select
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={sortField}
                onChange={(e) => setSortField(e.target.value as "date" | "amount" | "description")}
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

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading transactions...</div>
          ) : filteredAndSortedTransactions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No transactions found.</div>
          ) : (
            <div className="divide-y">
              {filteredAndSortedTransactions.map((txn) => {
                const acc = Array.isArray(txn.account) ? txn.account[0] : txn.account;
                const cat = Array.isArray(txn.category) ? txn.category[0] : txn.category;
                const currency = acc?.currency || "USD";

                return (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{txn.description || "Untitled"}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>{formatDate(txn.date)}</span>
                        <span>•</span>
                        <span>{acc?.name || "Account"}</span>
                        <span>•</span>
                        <span>{cat?.name || "Uncategorized"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`font-semibold text-sm ${
                          txn.type === "income" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {txn.type === "income" ? "+" : "-"}
                        {formatCurrency(Number(txn.amount), currency)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 h-8 w-8 p-0"
                        onClick={() => handleDelete(txn.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
