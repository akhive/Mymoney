import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RecoveryRedirect } from "@/components/auth/recovery-redirect";
import { Wallet, TrendingUp, Shield, Smartphone } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <RecoveryRedirect />
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Wallet className="h-6 w-6 text-primary" />
            <span>My Money</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900">
            Take control of your{" "}
            <span className="text-primary">money</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
            A simple, private finance tracker. Track income & expenses, manage
            accounts, and see where your money goes — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/signup">Create free account</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">I already have an account</Link>
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl p-6 shadow-sm border text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-lg">Track everything</h3>
            <p className="text-slate-600 text-sm">
              Income, expenses, multiple accounts and categories. See your full
              picture at a glance.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-lg">Your data stays private</h3>
            <p className="text-slate-600 text-sm">
              Each user only sees their own data. Secured with Row Level
              Security on Supabase.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <Smartphone className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-lg">Works on any device</h3>
            <p className="text-slate-600 text-sm">
              Fully responsive. Use it on your phone, tablet or computer —
              same account, same data.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t mt-24 py-8 text-center text-sm text-slate-500">
        Built with Next.js + Supabase · Private & multi-user ready
      </footer>
    </div>
  );
}
