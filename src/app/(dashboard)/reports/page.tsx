import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReportsView } from "./reports-table";

interface ReportTransaction {
  id: string;
  date: string;
  type: "income" | "expense";
  amount: number;
  description: string | null;
  account_id: string;
  account_name: string;
  account_currency: string;
  category_name: string;
}

interface ReportAccount {
  id: string;
  name: string;
  currency: string;
}

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const userId = claims?.sub;

  if (!userId) redirect("/login");

  const [{ data: profile }, { data: accountRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("preferred_currency")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("accounts")
      .select("id, name, currency")
      .eq("user_id", userId)
      .order("name"),
  ]);
  const accounts: ReportAccount[] = (accountRows ?? []).map((account) => ({
    ...account,
    currency: account.currency || "USD",
  }));

  const transactions: ReportTransaction[] = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("transactions")
      .select(
        "id, date, type, amount, description, account_id, account:accounts!transactions_account_id_fkey(name, currency), category:categories(name)"
      )
      .eq("user_id", userId)
      .in("type", ["income", "expense"])
      .order("date", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`Unable to load reports: ${error.message}`);

    const batch = data ?? [];
    transactions.push(
      ...batch.map((transaction) => {
        const account = Array.isArray(transaction.account)
          ? transaction.account[0]
          : transaction.account;
        const category = Array.isArray(transaction.category)
          ? transaction.category[0]
          : transaction.category;

        return {
          id: transaction.id,
          date: transaction.date,
          type: transaction.type as "income" | "expense",
          amount: Number(transaction.amount),
          description: transaction.description,
          account_id: transaction.account_id,
          account_name: account?.name || "Account",
          account_currency: account?.currency || "USD",
          category_name: category?.name || "Uncategorized",
        };
      })
    );

    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  return (
    <ReportsView
      transactions={transactions}
      accounts={accounts}
      currency={profile?.preferred_currency || "USD"}
    />
  );
}