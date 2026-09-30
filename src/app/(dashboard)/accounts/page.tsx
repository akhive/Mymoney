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
import { formatCurrency, CURRENCIES } from "@/lib/utils";
import type { Account } from "@/types/database";
import { Plus, CreditCard, Pencil, Trash2 } from "lucide-react";

const ACCOUNT_TYPES = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "credit_card", label: "Credit Card" },
  { value: "investment", label: "Investment" },
  { value: "other", label: "Other" },
] as const;

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#ef4444",
  "#a855f7",
  "#f59e0b",
  "#06b6d4",
  "#ec4899",
  "#64748b",
];

export default function AccountsPage() {
  const supabase = createClient();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<Account["type"]>("bank");
  const [balance, setBalance] = useState("0");
  const [color, setColor] = useState(COLORS[0]);
  const [accountCurrency, setAccountCurrency] = useState("USD");

  const loadAccounts = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const [{ data }, { data: profile }] = await Promise.all([
      supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_archived", false)
        .order("name"),
      supabase
        .from("profiles")
        .select("preferred_currency")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    if (data) setAccounts(data);
    if (profile?.preferred_currency) {
      setCurrency(profile.preferred_currency);
      setAccountCurrency(profile.preferred_currency);
    }
  }, [supabase]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  function openCreate() {
    setEditing(null);
    setName("");
    setType("bank");
    setBalance("0");
    setColor(COLORS[0]);
    setAccountCurrency(currency);
    setShowForm(true);
    setError(null);
  }

  function openEdit(account: Account) {
    setEditing(account);
    setName(account.name);
    setType(account.type);
    setBalance(String(account.balance));
    setColor(account.color);
    setAccountCurrency(account.currency || currency);
    setShowForm(true);
    setError(null);
  }

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

    if (editing) {
      const { error: updateError } = await supabase
        .from("accounts")
        .update({
          name,
          type,
          balance: parseFloat(balance) || 0,
          currency: accountCurrency,
          color,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editing.id)
        .eq("user_id", user.id);

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from("accounts").insert({
        user_id: user.id,
        name,
        type,
        balance: parseFloat(balance) || 0,
        currency: accountCurrency,
        color,
        is_archived: false,
      });

      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }
    }

    setShowForm(false);
    setEditing(null);
    setLoading(false);
    loadAccounts();
  }

  async function handleDelete(account: Account) {
    if (
      !confirm(
        `Delete account "${account.name}"? Transactions linked to it may be affected.`
      )
    )
      return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("accounts")
      .update({ is_archived: true })
      .eq("id", account.id)
      .eq("user_id", user.id);

    loadAccounts();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Accounts
          </h1>
          <p className="text-muted-foreground">
            Manage, rename, or delete your accounts
          </p>
        </div>
        <Button onClick={showForm ? () => setShowForm(false) : openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {showForm ? "Cancel" : "Add account"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? "Edit account" : "New account"}</CardTitle>
            <CardDescription>
              {editing ? "Rename or update this account" : "Add a new account"}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Chase Checking"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={type}
                  onChange={(e) => setType(e.target.value as Account["type"])}
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="balance">
                  {editing ? "Balance" : "Starting balance"}
                </Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={accountCurrency}
                  onChange={(e) => setAccountCurrency(e.target.value)}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        color === c ? "border-slate-900" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              </div>
              <Button type="submit" disabled={loading}>
                {loading
                  ? "Saving..."
                  : editing
                    ? "Save changes"
                    : "Create account"}
              </Button>
            </CardContent>
          </form>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.length === 0 && !showForm && (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No accounts yet. Create your first one!</p>
            </CardContent>
          </Card>
        )}
        {accounts.map((account) => (
          <Card key={account.id}>
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: account.color + "22" }}
              >
                <CreditCard
                  className="h-5 w-5"
                  style={{ color: account.color }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base truncate">
                  {account.name}
                </CardTitle>
                <CardDescription className="capitalize">
                  {account.type.replace("_", " ")} · {account.currency}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-2xl font-bold">
                {formatCurrency(
                  Number(account.balance),
                  account.currency || currency
                )}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(account)}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleDelete(account)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
