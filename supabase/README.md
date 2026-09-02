# Tectonex — Supabase Backend

ONYX uses its **own** Supabase project — separate from the BROKER/Velion backend (`lcqzpvhiuaynqxarzvsk`).

## Quick setup (new Supabase account)

### 1. Create a new project

1. Log into your **other** Supabase account: https://supabase.com/dashboard  
2. **New project** → name it `ONYX Exchange`  
3. Save the **project ref** (Settings → General)

### 2. Apply migrations

**Option A — Script (recommended)**

```powershell
cd meridian-markets
$env:SUPABASE_ACCESS_TOKEN = "sbp_your_token"   # https://supabase.com/dashboard/account/tokens
$env:PROJECT_REF = "your_new_project_ref"
node scripts/setup-new-supabase.mjs
```

**Option B — Supabase CLI**

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Migrations live in `supabase/migrations/` (001–040 broker schema + `041_onyx_backend.sql`).

### 3. Configure environment

`.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_APP_NAME=Tectonex
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Get URL and anon key from **Dashboard → Settings → API**.

Also set the same variables on **Vercel** (Production + Preview):

| Variable | Required | Where to get it |
|----------|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Dashboard → Settings → API |
| `NEXT_PUBLIC_APP_URL` | Yes (prod) | `https://onyxmarkets.site` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (server) | Dashboard → Settings → API → **service_role** (secret) |
| `CRON_SECRET` | Yes (prod) | Random string — Vercel cron sends `Authorization: Bearer <secret>` |
| `COINGECKO_API_KEY` | Optional | [CoinGecko](https://www.coingecko.com/en/api) demo/pro key |

Run `npm run sync-vercel-env` after filling server keys in `.env.local` to push them to Vercel.

**Without `SUPABASE_SERVICE_ROLE_KEY` on Vercel:** meme coin live prices, daily sync, and auto-seed will fail.

### 4. Auth redirect URLs

In **Authentication → URL Configuration**:

| Setting | Value |
|---------|--------|
| Site URL | `https://onyxmarkets.site` |
| Redirect URLs | `http://localhost:3000/**`, `https://onyxmarkets.site/**`, `https://www.onyxmarkets.site/**` |

### 5. Deposit wallets (optional)

Migration `005_deposit_config_seed.sql` seeds placeholder wallets. Update them in the Supabase dashboard (`platform_settings` → `deposit_config`) or via your admin panel.

---

## What’s connected

| Feature | Table / RPC | Frontend |
|---------|-------------|----------|
| Auth & profiles | `auth.users`, `profiles` | `/login`, `/register`, `/dashboard/settings` |
| Balances | `balances` | Dashboard, portfolio, trade |
| Spot trading | `trades`, `holdings` | `/dashboard/trade` |
| Deposits | `deposits`, `platform_settings` | `/dashboard/deposit` |
| Withdrawals | `withdrawals`, `get_withdrawal_eligibility` | `/dashboard/withdraw` |
| AI bots | `ai_trading_subscriptions` | `/dashboard/ai-trading` |
| Copy trading | `copy_trading_subscriptions` | `/dashboard/copy-trading` |

---

## BROKER database (old — disconnected)

ONYX no longer uses the BROKER/Velion Supabase project. That database was reverted to Velion defaults (welcome message + KYC-gated RLS). Existing users on that project belong to Velion/BROKER only.
