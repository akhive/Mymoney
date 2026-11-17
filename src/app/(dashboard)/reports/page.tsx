import { redirect } from "next/navigation";
import {
  getCurrentClaims,
  getCurrentProfile,
  getServerClient,
} from "@/lib/supabase/server";
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
  const claims = await getCurrentClaims();
  const userId = claims?.sub;

  if (!userId) redirect("/login");

  const supabase = await getServerClient();

  const [profile, { data: accountRows }] = await Promise.all([
    getCurrentProfile(userId),
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

  const accountsById = new Map(accounts.map((account) => [account.id, account]));

  // Account names come from the accounts list above, so each row only needs
  // the category name joined in. Keeps the payload small.
  const pageSize = 1000;
  const fetchPage = (offset: number, withCount = false) =>
    supabase
      .from("transactions")
      .select(
        "id, date, type, amount, description, account_id, category:categories(name)",
        withCount ? { count: "exact" } : undefined
      )
      .eq("user_id", userId)
      .in("type", ["income", "expense"])
      .order("date", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);

  // First page tells us the total; any remaining pages load in parallel
  // instead of one after another.
  const first = await fetchPage(0, true);
  if (first.error) {
    throw new Error(`Unable to load reports: ${first.error.message}`);
  }
  const total = first.count ?? first.data?.length ?? 0;
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, Math.ceil(total / pageSize) - 1) }, (_, i) =>
      fetchPage((i + 1) * pageSize)
    )
  );
  const failed = rest.find((page) => page.error);
  if (failed?.error) {
    throw new Error(`Unable to load reports: ${failed.error.message}`);
  }

  const transactions: ReportTransaction[] = [first, ...rest]
    .flatMap((page) => page.data ?? [])
    .map((transaction) => {
      const account = accountsById.get(transaction.account_id);
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
    });

  return (
    <ReportsView
      transactions={transactions}
      accounts={accounts}
      currency={profile?.preferred_currency || "USD"}
    />
  );
}