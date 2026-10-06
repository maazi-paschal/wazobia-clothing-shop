# WAZOBIA — Contemporary Afro-Minimalist Fashion

Wazobia is an editorial-luxury fashion e-commerce storefront (in the spirit of Zara, Kith and Aimé Leon Dore) built with plain HTML, CSS and JavaScript, backed by Supabase and Mailgun.

**Live demo:** https://wazobia-clothing-shop.vercel.app/ · **Repository:** https://github.com/PascalObiorahC/wazobia-clothing-shop.git

## Key Features

- **Afro-minimalist editorial design** — warm alabaster palette, terracotta accent, Syne + Inter typography, frosted sticky navbar, high-fashion hero banner, and 3:4 product cards.
- **Navbar & Profile Integration** — extreme-right Google user profile avatar with `"Hi, [FirstName]"` greeting on desktop, linking directly to a dedicated `profile.html` page.
- **Dedicated Profile & Order History (`profile.html`)** — user card with VIP Member badge, avatar, and dynamic order history queried directly from Supabase `orders`.
- **Phone Input with Country Code Selector** — interactive country code dropdown (🇳🇬 +234, 🇺🇸 +1, 🇬🇧 +44, 🇬🇭 +233, 🇰🇪 +254, 🇿🇦 +27, 🇨🇦 +1) on `checkout.html`.
- **Luxury Editorial Footer** — dark luxury footer (`#111111`) with brand tagline, newsletter subscription, quick links, policy modals, and reassurance tags across all pages.
- **Pay on Delivery (COD) Checkout** — streamlined checkout with phone number validation, "TEST STORE • PAY ON DELIVERY" badge, doorstep total highlight, and clear callout explanations.
- **Google OAuth** via Supabase Auth (avatar/name in navbar, checkout pre-fill).
- **Supabase PostgreSQL** — `products` catalog loaded live from the database (seed it with `supabase/seed.sql`) and `orders` storage.
- **Mailgun receipts** — styled HTML order confirmation with `TOTAL DUE ON DELIVERY` banner sent from a serverless endpoint.
- **Cart & checkout** — localStorage-persisted bag, slide-out drawer, quantity steppers, free shipping over $100, and order confirmation modal.
- Cookie consent banner and toast notifications.

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | HTML5, vanilla CSS (design tokens), vanilla JS |
| Auth / DB | Supabase (`@supabase/supabase-js@2` via CDN), PostgreSQL |
| Backend | Node 18+ serverless function `api/checkout.js` (no dependencies) |
| Email | Mailgun REST API |
| Hosting | Vercel or Netlify |

## Project Structure

```
index.html          Storefront
checkout.html       Checkout page
styles.css          Design system
common.js           Supabase client, auth, cart, toasts
api/checkout.js     Checkout handler (Vercel-style)
netlify/functions/  Netlify wrapper for the same handler
server.js           Zero-dependency local dev server
```

## Environment Variables

Copy `.env.example` to `.env`:

```env
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=      # optional, server-only
MAILGUN_API_KEY=YOUR_MAILGUN_API_KEY
MAILGUN_DOMAIN=sandboxXXXXXXXX.mailgun.org
MAILGUN_API_BASE=https://api.mailgun.net   # EU: https://api.eu.mailgun.net
```

The browser dynamically retrieves public configuration from the serverless endpoint `/api/config` at runtime. No keys or secret strings are hardcoded in client scripts.

## Supabase Setup

Run the SQL in [AGENTS.md](AGENTS.md#database-schemas) to create `products` and `orders`, then in Authentication → Providers enable **Google** (create an OAuth 2.0 Web Client in Google Cloud Console, add Supabase's callback URL as an authorized redirect URI) and add your site URLs under Authentication → URL Configuration.

## Mailgun Setup

Create a Mailgun domain (a sandbox domain works). Sandbox domains only deliver to **authorized recipients** — add your test email under Sending → Domain settings → Authorized Recipients and verify it.

## Run Locally

```bash
cp .env.example .env     # fill in values
node server.js           # http://localhost:3000
```

## Deploy

**Vercel:** `npm i -g vercel && vercel` — `api/checkout.js` is auto-detected. Add the env vars in Project Settings → Environment Variables.

**Netlify:** connect the repo (config in `netlify.toml`; `/api/checkout` is rewritten to the function). Add the env vars in Site settings → Environment variables.

After deploying, add your production URL to Supabase's redirect URLs.

## Notes

- Payment is **simulated**; no card data is collected.
- Order totals are recomputed server-side from items.