# My Money

A multi-user personal finance tracker built with **Next.js 15** + **Supabase**.

- Mobile + desktop responsive
- Each user only sees their own data (Row Level Security)
- You host it once → friends just sign up on your domain

---

## Quick Start

### 1. Create Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Copy **Project URL** and **anon public** key from Settings → API
3. Open **SQL Editor** → paste and run the entire contents of `supabase/schema.sql`
4. Go to Authentication → Providers → enable **Email**
5. (Optional for testing) Authentication → Settings → turn **off** “Confirm email”

### 2. Setup the app

```bash
cd my-money
cp .env.local.example .env.local
# Edit .env.local and paste your Supabase URL + anon key

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 3. Deploy to Vercel

```bash
# Push to GitHub first
git init
git add .
git commit -m "Initial My Money app"
git remote add origin https://github.com/YOUR_USERNAME/my-money.git
git push -u origin main
```

1. Go to [vercel.com](https://vercel.com) → New Project → import the repo
2. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy

### 4. Custom domain (Cloudflare)

1. In Vercel → Project → Settings → Domains → add your domain
2. In Cloudflare DNS:
   - Type: `CNAME`
   - Name: `@` (or `www`)
   - Target: `cname.vercel-dns.com` (or the value Vercel shows)
   - Proxy: DNS only (or Proxied — both work)

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/
│   │   ├── dashboard/          # Overview
│   │   ├── transactions/       # List + New
│   │   ├── accounts/           # Manage accounts
│   │   ├── categories/         # Income/Expense categories
│   │   └── budgets/            # Placeholder
│   ├── layout.tsx
│   └── page.tsx                # Landing page
├── components/
│   ├── layout/                 # Sidebar + Mobile nav
│   └── ui/                     # Button, Card, Input, Label
├── lib/
│   ├── supabase/               # Client, Server, Middleware
│   └── utils.ts
└── types/
    └── database.ts
```

---

## Features (v1)

| Feature              | Status |
|----------------------|--------|
| Auth (email/password)| ✅     |
| Accounts             | ✅     |
| Categories           | ✅     |
| Transactions         | ✅     |
| Dashboard summary    | ✅     |
| Mobile bottom nav    | ✅     |
| Desktop sidebar      | ✅     |
| Budgets              | 🔜     |
| Charts               | 🔜     |
| Recurring txns       | 🔜     |
| CSV export           | 🔜     |

---

## Important Security Notes

- **Never** put the Supabase `service_role` key in the frontend or in `NEXT_PUBLIC_*` variables.
- Row Level Security is enabled on all tables. Every query is automatically filtered by `auth.uid()`.
- Friends create their own accounts on your app — their data stays completely isolated.

---

## Next Steps You Can Ask For

- Add budget tracking UI
- Charts (spending by category)
- Edit / delete transactions & accounts
- Dark mode
- Multi-currency support
