import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReportsView } from "./reports-view";

interface ReportTransaction {
  date: string;
  type: "income" | "expense";
  amount: number;
}

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const userId = claims?.sub;

  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_currency")
    .eq("id", userId)
    .maybeSingle();

  const transactions: ReportTransaction[] = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("transactions")
      .select("date, type, amount, id")
      .eq("user_id", userId)
      .order("date", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`Unable to load reports: ${error.message}`);

    const batch = data ?? [];
    transactions.push(
      ...batch.map((transaction) => ({
        date: transaction.date,
        type: transaction.type as "income" | "expense",
        amount: Number(transaction.amount),
      }))
    );

    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  return (
    <ReportsView
      transactions={transactions}
      currency={profile?.preferred_currency || "USD"}
      currentYear={new Date().getFullYear()}
    />
  );
}