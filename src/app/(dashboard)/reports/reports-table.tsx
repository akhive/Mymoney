"use client";

import { useMemo, useState } from "react";
import { Download, Printer, Search } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

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

interface ReportsViewProps {
  transactions: ReportTransaction[];
  accounts: ReportAccount[];
  currency: string;
}

type PeriodPreset =
  | "this_month"
  | "last_month"
  | "this_year"
  | "last_year"
  | "custom"
  | "all_time";

function dateInputValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function getPeriodDates(preset: PeriodPreset) {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth(), 1);
  let to = today;

  if (preset === "last_month") {
    from.setMonth(from.getMonth() - 1);
    to = new Date(today.getFullYear(), today.getMonth(), 0);
  } else if (preset === "this_year") {
    from.setMonth(0, 1);
  } else if (preset === "last_year") {
    from.setFullYear(from.getFullYear() - 1, 0, 1);
    to = new Date(today.getFullYear() - 1, 11, 31);
  }

  return { from: dateInputValue(from), to: dateInputValue(to) };
}

export function ReportsView({
  transactions,
  accounts,
  currency,
}: ReportsViewProps) {
  const initialPeriod = getPeriodDates("this_month");
  const [preset, setPreset] = useState<PeriodPreset>("this_month");
  const [dateFrom, setDateFrom] = useState(initialPeriod.from);
  const [dateTo, setDateTo] = useState(initialPeriod.to);
  const [accountId, setAccountId] = useState("all");
  const [search, setSearch] = useState("");

  const selectedAccount = accounts.find((account) => account.id === accountId);
  const accountLabel = selectedAccount
    ? `${selectedAccount.name} (${selectedAccount.currency})`
    : "All accounts";
  const periodLabel = dateFrom || dateTo
    ? `${dateFrom || "Beginning"} to ${dateTo || "Today"}`
    : "All dates";

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return transactions
      .filter((transaction) => {
        const matchesAccount =
          accountId === "all" || transaction.account_id === accountId;
        const matchesFrom = !dateFrom || transaction.date >= dateFrom;
        const matchesTo = !dateTo || transaction.date <= dateTo;
        const matchesSearch =
          !query ||
          [
            transaction.description,
            transaction.category_name,
            transaction.account_name,
          ].some((value) => value?.toLocaleLowerCase().includes(query));
        return matchesAccount && matchesFrom && matchesTo && matchesSearch;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [accountId, dateFrom, dateTo, search, transactions]);

  const totalsByCurrency = useMemo(
    () =>
      filteredTransactions.reduce<Record<string, number>>(
        (totals, transaction) => {
          const sign = transaction.type === "income" ? 1 : -1;
          totals[transaction.account_currency] =
            (totals[transaction.account_currency] || 0) +
            sign * transaction.amount;
          return totals;
        },
        {}
      ),
    [filteredTransactions]
  );

  function selectPeriod(nextPreset: PeriodPreset) {
    setPreset(nextPreset);
    if (nextPreset === "custom") return;
    if (nextPreset === "all_time") {
      setDateFrom("");
      setDateTo("");
      return;
    }
    const nextDates = getPeriodDates(nextPreset);
    setDateFrom(nextDates.from);
    setDateTo(nextDates.to);
  }

  function signedAmount(transaction: ReportTransaction) {
    const sign = transaction.type === "income" ? "+" : "-";
    return `${sign}${formatCurrency(
      transaction.amount,
      transaction.account_currency || currency
    )}`;
  }

  function filePeriod() {
    return `${dateFrom || "all"}_to_${dateTo || "time"}`;
  }

  function exportToExcel() {
    const rows = [
      ["Report period", periodLabel],
      ["Account", accountLabel],
      ["Search", search || "All transactions"],
      [],
      ["Date", "Description", "Category", "Account", "Amount"],
      ...filteredTransactions.map((transaction) => [
        transaction.date,
        transaction.description || "",
        transaction.category_name,
        `${transaction.account_name} (${transaction.account_currency})`,
        signedAmount(transaction),
      ]),
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 14 },
      { wch: 32 },
      { wch: 22 },
      { wch: 28 },
      { wch: 20 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
    XLSX.writeFile(workbook, `Report_${filePeriod()}.xlsx`);
  }

  return (
    <section data-report-print className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Reports</h1>
          <p className="text-sm text-muted-foreground">
            {accountLabel} · {periodLabel}
          </p>
        </div>
        <div data-report-controls className="flex gap-2 print:hidden">
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print / PDF
          </Button>
          <Button type="button" onClick={exportToExcel}>
            <Download className="mr-2 h-4 w-4" />
            Excel
          </Button>
        </div>
      </header>

      <div
        data-report-controls
        className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden"
      >
        <div className="space-y-1.5">
          <Label htmlFor="report-account">Account</Label>
          <select
            id="report-account"
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="all">All accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.currency})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="report-period">Period</Label>
          <select
            id="report-period"
            value={preset}
            onChange={(event) => selectPeriod(event.target.value as PeriodPreset)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="this_month">This month</option>
            <option value="last_month">Last month</option>
            <option value="this_year">This year</option>
            <option value="last_year">Last year</option>
            <option value="custom">Custom range</option>
            <option value="all_time">All time</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="report-from">From</Label>
          <Input
            id="report-from"
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(event) => {
              setPreset("custom");
              setDateFrom(event.target.value);
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="report-to">To</Label>
          <Input
            id="report-to"
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(event) => {
              setPreset("custom");
              setDateTo(event.target.value);
            }}
          />
        </div>

        <div className="relative space-y-1.5 sm:col-span-2 lg:col-span-4">
          <Label htmlFor="report-search">Search report rows</Label>
          <Search className="absolute left-2.5 top-[34px] h-4 w-4 text-muted-foreground" />
          <Input
            id="report-search"
            className="pl-8"
            placeholder="Description, category, or account"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground">
          {filteredTransactions.length} transaction(s) · {periodLabel}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(totalsByCurrency).map(([code, total]) => (
            <span key={code} className="font-semibold">
              Net {formatCurrency(total, code)}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b bg-muted/60 text-xs uppercase text-muted-foreground">
              <th className="px-3 py-3 font-medium">Date</th>
              <th className="px-3 py-3 font-medium">Description</th>
              <th className="px-3 py-3 font-medium">Category</th>
              <th className="px-3 py-3 font-medium">Account</th>
              <th className="px-3 py-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">
                  No transactions match this report.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="border-b last:border-0">
                  <td className="whitespace-nowrap px-3 py-2.5">{transaction.date}</td>
                  <td className="px-3 py-2.5">{transaction.description || "—"}</td>
                  <td className="px-3 py-2.5">{transaction.category_name}</td>
                  <td className="px-3 py-2.5">
                    {transaction.account_name} ({transaction.account_currency})
                  </td>
                  <td
                    className={`whitespace-nowrap px-3 py-2.5 text-right font-medium ${
                      transaction.type === "income"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {signedAmount(transaction)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            {Object.entries(totalsByCurrency).map(([code, total]) => (
              <tr key={code} className="border-t bg-muted/30 font-semibold">
                <td colSpan={4} className="px-3 py-3 text-right">
                  Net total ({code})
                </td>
                <td className="px-3 py-3 text-right">{formatCurrency(total, code)}</td>
              </tr>
            ))}
          </tfoot>
        </table>
      </div>
    </section>
  );
}