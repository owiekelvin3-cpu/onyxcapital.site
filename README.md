# Onyx Capital

Crypto exchange frontend cloned as a new brand. No backend is included — wire your own when you are ready.

**Stack:** Next.js 16 · Tailwind CSS 4 · React 19

## Features

- Landing, markets, products, community, and legal pages
- Email login / registration UI
- Dashboard: trade, portfolio, deposit, withdraw, AI bots, copy trading
- Admin console UI
- Responsive dark theme with lime accent

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Production: [https://onyxcapital.site](https://onyxcapital.site).

Marketing pages run without a backend. Login, dashboard, and admin need your new API before they can load live data.

## Environment

Copy `.env.example` to `.env.local` and add your backend keys when you have them.

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | No | Display name (default: Onyx Capital) |
| `NEXT_PUBLIC_APP_URL` | No | Canonical URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Later | Backend URL when you connect one |
| `NEXT_PUBLIC_SMARTSUPP_KEY` | No | Smartsupp chat box key (Settings → Chat box → Chat code) |

Frontend data helpers live in `src/lib/api` and `src/lib/supabase`. Replace those when you attach the new backend.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
