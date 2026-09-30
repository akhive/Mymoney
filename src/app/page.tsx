import Link from "next/link";
import { RecoveryRedirect } from "@/components/auth/recovery-redirect";
import {
  ArrowRight,
  ChartNoAxesCombined,
  Globe2,
  ShieldCheck,
  Wallet,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      <RecoveryRedirect />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(#94a3b8_0.7px,transparent_0.7px)] [background-size:24px_24px]"
      />

      <header className="relative z-10 mx-auto flex h-16 w-full max-w-7xl shrink-0 items-center justify-between border-b border-slate-800/80 px-5 sm:px-8">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-lg shadow-indigo-950/60 transition-transform group-hover:scale-105">
            <Wallet className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-lg font-bold text-white">My Money</span>
        </Link>
        <nav aria-label="Account" className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-md px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-950/50 transition-colors hover:bg-indigo-500"
          >
            Get started
          </Link>
        </nav>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 py-10 sm:px-8 sm:py-14">
        <section className="mx-auto w-full text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3.5 py-1.5 text-xs font-medium text-indigo-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Multi-currency &amp; real-time tracking
          </div>

          <h1 className="mx-auto max-w-3xl text-3xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
            Master your money with total{" "}
            <span className="bg-gradient-to-r from-indigo-300 via-cyan-200 to-emerald-300 bg-clip-text text-transparent">
              clarity
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Track income, monitor multi-currency accounts, build smart budgets,
            and understand your financial progress in one place.
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/60 transition-colors hover:bg-indigo-500"
            >
              Get started
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white"
            >
              Log in
            </Link>
          </div>

          <div className="mt-10 grid w-full grid-cols-1 gap-3 text-left md:grid-cols-3">
            <article className="flex items-start gap-4 rounded-lg border border-slate-800 bg-slate-900/80 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-indigo-400/20 bg-indigo-400/10 text-indigo-300">
                <ChartNoAxesCombined className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-white">Smart analytics</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  Visual spending breakdowns and clear income-to-expense comparisons.
                </p>
              </div>
            </article>

            <article className="flex items-start gap-4 rounded-lg border border-slate-800 bg-slate-900/80 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-white">Private by design</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  Personal financial data protected with Supabase row-level security.
                </p>
              </div>
            </article>

            <article className="flex items-start gap-4 rounded-lg border border-slate-800 bg-slate-900/80 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
                <Globe2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-white">Multi-currency</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  Track accounts and budgets in AED, USD, EUR, INR, and more.
                </p>
              </div>
            </article>
          </div>
        </section>
      </main>

      <footer className="relative z-10 shrink-0 border-t border-slate-800/80 py-4">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 sm:px-8">
          <span className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <Wallet className="h-3.5 w-3.5 text-indigo-300" aria-hidden="true" />
            My Money
          </span>
          <span className="text-xs text-slate-500">Built by AkBuilts</span>
        </div>
      </footer>
    </div>
  );
}
