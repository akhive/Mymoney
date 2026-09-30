"use client";

import { useState, useEffect, useCallback } from "react";
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
import { formatCurrency } from "@/lib/utils";
import type { Budget, Category } from "@/types/database";
import { Plus, Trash2, PieChart } from "lucide-react";

type BudgetWithCategory = Budget & {
  spent?: number;
  category?: Category | Category[] | null;
};

export default function BudgetsPage() {
  const supabase = createClient();
  const [budgets, setBudgets] = useState<BudgetWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const end = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

    const [budgetRes, catRes, txnRes, profileRes] = await Promise.all([
      supabase
        .from("budgets")
        .select("*, category:categories(*)")
        .eq("user_id", user.id)
        .eq("month", month)
        .eq("year", year),
      supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "expense")
        .order("name"),
      supabase
        .from("transactions")
        .select("category_id, amount")
        .eq("user_id", user.id)
        .eq("type", "expense")
        .gte("date", start)
        .lt("date", end),
      supabase
        .from("profiles")
        .select("preferred_currency")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    if (catRes.data) setCategories(catRes.data);
    if (profileRes.data?.preferred_currency)
      setCurrency(profileRes.data.preferred_currency);

    const spentMap: Record<string, number> = {};
    txnRes.data?.forEach((t) => {
      if (t.category_id) {
        spentMap[t.category_id] =
          (spentMap[t.category_id] || 0) + Number(t.amount);
      }
    });

    if (budgetRes.data) {
      const rawBudgets = budgetRes.data as unknown as BudgetWithCategory[];
      setBudgets(
        rawBudgets.map((b) => ({
          ...b,
          spent: spentMap[b.category_id] || 0,
        }))
      );
    } else {
      setBudgets([]);
    }
  }, [supabase, month, year]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
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

    const num = parseFloat(amount);
    if (!categoryId || isNaN(num) || num <= 0) {
      setError("Select a category and enter a valid amount");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("budgets").insert({
      user_id: user.id,
      category_id: categoryId,
      amount: num,
      month,
      year,
    });

    if (insertError) {
      setError(
        insertError.message.includes("unique")
          ? "Budget already exists for this category this month"
          : insertError.message
      );
      setLoading(false);
      return;
    }

    setShowForm(false);
    setAmount("");
    setCategoryId("");
    setLoading(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this budget?")) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("budgets").delete().eq("id", id).eq("user_id", user.id);
    load();
  }

  const monthName = new Date(year, month - 1).toLocaleString("default", {
    month: "long",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Budgets
          </h1>
          <p className="text-muted-foreground">
            Set monthly limits for expense categories
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          {showForm ? "Cancel" : "Add budget"}
        </Button>
      </div>

      <div className="flex gap-3 items-center flex-wrap">
        <select
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(2000, i).toLocaleString("default", { month: "long" })}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {[year - 1, year, year + 1].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground">
          Showing {monthName} {year}
        </span>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New budget for {monthName}</CardTitle>
          </CardHeader>
          <form onSubmit={handleCreate}>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label>Category</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Budget amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Create budget"}
              </Button>
            </CardContent>
          </form>
        </Card>
      )}

      {budgets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <PieChart className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No budgets for {monthName} {year}.</p>
            <p className="text-sm mt-1">
              Create expense categories first, then add budgets.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {budgets.map((b) => {
            const spent = b.spent || 0;
            const pct = Math.min(100, (spent / Number(b.amount)) * 100);
            const over = spent > Number(b.amount);
            const categoryName = Array.isArray(b.category)
              ? b.category[0]?.name
              : b.category?.name;

            return (
              <Card key={b.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-base">
                      {categoryName || "Category"}
                    </CardTitle>
                    <CardDescription>
                      {formatCurrency(spent, currency)} of{" "}
                      {formatCurrency(Number(b.amount), currency)}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600"
                    onClick={() => handleDelete(b.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        over ? "bg-red-500" : "bg-primary"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p
                    className={`text-xs mt-2 ${
                      over ? "text-red-600 font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {over
                      ? `Over by ${formatCurrency(spent - Number(b.amount), currency)}`
                      : `${formatCurrency(Number(b.amount) - spent, currency)} left`}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
