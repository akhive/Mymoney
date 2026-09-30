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
import type { Category, CategoryType } from "@/types/database";
import { Plus, Pencil, Trash2 } from "lucide-react";

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

export default function CategoriesPage() {
  const supabase = createClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("expense");
  const [color, setColor] = useState(COLORS[0]);

  const loadCategories = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("type")
      .order("name");

    if (data) setCategories(data);
  }, [supabase]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  function openCreate() {
    setEditing(null);
    setName("");
    setType("expense");
    setColor(COLORS[0]);
    setShowForm(true);
    setError(null);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    setName(cat.name);
    setType(cat.type);
    setColor(cat.color);
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
        .from("categories")
        .update({ name, type, color })
        .eq("id", editing.id)
        .eq("user_id", user.id);

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from("categories").insert({
        user_id: user.id,
        name,
        type,
        icon: "tag",
        color,
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
    loadCategories();
  }

  async function handleDelete(cat: Category) {
    if (!confirm(`Delete category "${cat.name}"?`)) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("categories")
      .delete()
      .eq("id", cat.id)
      .eq("user_id", user.id);

    loadCategories();
  }

  const incomeCats = categories.filter((c) => c.type === "income");
  const expenseCats = categories.filter((c) => c.type === "expense");

  function CategoryList({ items }: { items: Category[] }) {
    if (items.length === 0) {
      return <p className="text-sm text-muted-foreground">None yet</p>;
    }
    return (
      <div className="space-y-2">
        {items.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 py-2 border-b last:border-0"
          >
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: c.color }}
            />
            <span className="flex-1">{c.name}</span>
            <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600"
              onClick={() => handleDelete(c)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Categories
          </h1>
          <p className="text-muted-foreground">
            Organize, rename, or delete categories
          </p>
        </div>
        <Button onClick={showForm ? () => setShowForm(false) : openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {showForm ? "Cancel" : "Add category"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editing ? "Edit category" : "New category"}
            </CardTitle>
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
                  placeholder="e.g. Groceries"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
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
                    : "Create category"}
              </Button>
            </CardContent>
          </form>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Income</CardTitle>
            <CardDescription>{incomeCats.length} categories</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryList items={incomeCats} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Expense</CardTitle>
            <CardDescription>{expenseCats.length} categories</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryList items={expenseCats} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
