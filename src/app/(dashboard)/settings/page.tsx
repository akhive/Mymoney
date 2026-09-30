"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CURRENCIES } from "@/lib/utils";

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [currency, setCurrency] = useState("USD");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    setEmail(user.email || "");
    setFullName(user.user_metadata?.full_name || "");

    const { data: profile } = await supabase
      .from("profiles")
      .select("preferred_currency, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.preferred_currency) setCurrency(profile.preferred_currency);
    if (profile?.full_name) setFullName(profile.full_name);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMessage("Not authenticated");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      full_name: fullName,
      preferred_currency: currency,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Settings saved.");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Currency and profile preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>
            Choose your default currency for the dashboard
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="space-y-4">
            {message && (
              <div className="rounded-md bg-slate-50 border px-3 py-2 text-sm">
                {message}
              </div>
            )}
            <div className="space-y-2">
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Display name</Label>
              <input
                id="fullName"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Preferred currency</Label>
              <select
                id="currency"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save settings"}
            </Button>
          </CardContent>
        </form>
      </Card>

    </div>
  );
}
