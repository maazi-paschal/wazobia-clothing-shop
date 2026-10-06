# AGENTS.md — Wazobia

> **IMPORTANT FOR ALL AI AGENTS: AGENTS.md is a living document. Any AI coding agent that performs work, alters architecture, adds features, or modifies schemas in this repository MUST review and update this file at the end of its turn to ensure zero loss of context for future agents.**

## Application Overview

Wazobia is a contemporary Afro-minimalist fashion e-commerce site: storefront (`index.html`), checkout (`checkout.html`), and a serverless checkout endpoint (`api/checkout.js`). Aesthetic: editorial luxury (Zara / Kith / Aimé Leon Dore).

## Tech Stack

- Frontend: static HTML, vanilla CSS (tokens in `styles.css`), vanilla JS (`common.js` + inline page scripts).
- Auth + DB: Supabase (JS SDK v2 from jsDelivr CDN), PostgreSQL.
- Backend: Node 18+ dependency-free handler `api/checkout.js` (Vercel-style `(req,res)`), wrapped by `netlify/functions/checkout.js` and served locally by `server.js`.
- Email: Mailgun REST API.

## Zero-Friction Architecture

No build step, no bundler, no npm dependencies. `node server.js` runs everything locally. Cart lives in `localStorage` (`wazobia_cart_v1`); cookie choice in `wazobia_cookie`.

### Client / Server Separation

| Concern | Where | Key used |
|---|---|---|
| Read products (`select * from products`), Google auth | **Browser** (`index.html`, `common.js` via `sb`) | public `SUPABASE_ANON_KEY` only (RLS read policy) |
| Re-price cart from `products`, insert into `orders`, send Mailgun receipt | **Server** (`api/checkout.js`) | `SUPABASE_SERVICE_ROLE_KEY` (or anon + insert policy), `MAILGUN_API_KEY` |

The storefront has **no hardcoded product list**: `loadProducts()` queries Supabase and shows a loading skeleton, then either the grid or an error message with Retry (`console.error` on failure). If the table is empty, the grid says no products are available — seed it by running `supabase/seed.sql`. The 36-item source data lives in `scripts/catalog-data.js` (never loaded by the browser); `node scripts/generate-seed.js` regenerates `supabase/seed.sql` from it. `server.js` refuses to serve `scripts/`, `supabase/`, `api/`, `.env`.

## Design System Tokens (do not alter)

`--bg-primary #fcfbf9`, `--bg-surface #fff`, `--text-primary #111`, `--text-muted #6e6d67`, `--border-subtle #e8e6df`, `--accent #c85a32`, `--accent-hover #ad4b27`, `--badge-bg #f4f2ec`. Fonts: Syne (headings/logo), Inter (body/UI). Uppercase tracked text uses `letter-spacing: 0.12em`.

## Database Schemas

```sql
create table products (
  id text primary key,            -- e.g. 'wz-001' (uuid also tolerated by the client)
  name text not null,
  category text not null,         -- 'Men' | 'Women' | 'Accessories'
  price numeric(10,2) not null,
  image_url text,
  description text,
  sizes jsonb default '["S","M","L","XL"]',  -- array of size strings (S..XXL or "One Size")
  tag text,                        -- 'NEW' | 'BESTSELLER' | 'LIMITED' | null
  rating numeric(2,1),
  reviews integer default 0
);
-- Existing tables: run supabase/seed.sql, which adds tag/rating/reviews via `add column if not exists` and upserts all 36 products.
alter table products enable row level security;
create policy "public read products" on products for select using (true);

create table orders (
  id text primary key,            -- 'WZ-XXXXXX' order reference
  user_email text not null,
  customer_name text not null,
  phone_number text,
  shipping_address jsonb not null, -- {street, city, state, postal_code, country, phone_number}
  items jsonb not null,            -- [{id, name, size, quantity, price}]
  total_amount numeric(10,2) not null,
  payment_method text default 'Pay on Delivery',
  status text not null default 'Order Placed - Pending Delivery',
  created_at timestamptz not null default now()
);
alter table orders enable row level security;
-- Inserts happen server-side. Preferred: use SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
-- If only the anon key is configured, add an insert policy:
-- create policy "anon insert orders" on orders for insert with check (true);
```

## Authentication Flow

1. User clicks **Sign in** → `sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`.
2. Supabase redirects to Google (OAuth 2.0 Web Client created in Google Cloud Console; authorized redirect URI = `https://<project>.supabase.co/auth/v1/callback`; client ID/secret entered in Supabase → Auth → Providers → Google).
3. Supabase returns to the site; `initAuth()` in `common.js` reads the session, updates navbar (avatar/name + Sign Out) and fires `authchange`, which pre-fills checkout.
4. Guests can still check out by typing details.

## Transactional Email Architecture

`POST https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages` (`MAILGUN_API_BASE` overrides the host for EU).
- Auth: Basic `api:${MAILGUN_API_KEY}`.
- Form fields (`application/x-www-form-urlencoded`): `from` (`Wazobia <postmaster@DOMAIN>`), `to` (customer), `subject` (`Order Confirmed - Wazobia #WZ-XXXXXX`), `html` (styled itemized receipt + delivery address).
- **Sandbox requirement:** sandbox domains only send to verified *Authorized Recipients*. Email failure never blocks the order; the API returns `email_sent: false`.

## API Contract

`POST /api/checkout` body `{ user_email, customer_name, phone_number, shipping_address, items, total_amount, payment_method, status }` → `200 { success, order_id, total_amount, email_sent }`; `400` on validation or unknown product id; `500` if pricing lookup or DB insert fails. The server sanitizes/length-limits all strings, **ignores client prices and `total_amount`**, re-prices each item from `products` by `id`, and recomputes the total (free shipping ≥ $100, else $10 flat — keep in sync with `common.js`). `checkout.html` validates (email regex, phone, non-empty address/city/state/postal code), sanitizes, shows inline errors, and disables **Confirm Order (Pay on Delivery)** with a spinner while the request is in flight.

## Verification & Testing Protocol

1. **Manual browser checks:** run `node server.js`; verify hero, filters, size pills, add-to-bag toast, drawer steppers, free-shipping bar, cookie banner, refresh persistence, checkout form, receipt modal, Continue Shopping clears cart.
2. **Supabase write verification:** after a test order confirm a row in `orders` with correct columns/JSON and `status='pending'`.
3. **Mailgun receipt check:** confirm the email arrives (authorized recipient for sandbox) with correct subject, items, address.
4. **Console error audit:** DevTools console clean on both pages (expected info: "Using seeded products" when the table is empty/offline).

## Strict Constraints

- Do not casually introduce heavy frameworks (React, Tailwind, bundlers).
- Keep design system tokens intact.
- Preserve database column names.
- Keep sensitive keys (Mailgun, service role) off the client. Only the public anon key may appear in `common.js`.

## Handoff Checklist

- [x] Anon key set in `common.js`; local `.env` (gitignored) holds Supabase + Mailgun values. Still set env vars on the host (Vercel/Netlify).
- [ ] `products` / `orders` tables + RLS created; Google provider enabled.
- [ ] Mailgun domain configured; recipient authorized if sandbox.
- [ ] Manual, DB, email and console checks above passed.
- [ ] This file updated with any changes made this turn.

## Change Log

- Initial build: storefront, checkout, API, local server, Netlify/Vercel support, docs.
- Enterprise refactor: removed client-side product fallback (products now load only from Supabase with skeleton + error state); moved seed data to `scripts/catalog-data.js`; checkout form validation/sanitization + spinner/duplicate-submit guard; API now sanitizes inputs and re-prices items from `products`; audited that no Mailgun/service-role secrets appear in HTML/`common.js`.
- Storefront upgrade: full-bleed hero with Shop Men/Women CTAs, value strip, responsive filters (pills on desktop, dropdowns <=768px, sort, reset), 36-item catalog (`catalog.js`), card ratings/tags/"Added ✓" state, mobile overflow fixes. Added `tag`, `rating`, `reviews` columns to `products`; 'Outerwear' filter is derived client-side from the product name.
- Luxury Editorial Footer & Pay on Delivery: Added dark luxury footer (#111111) with newsletter subscription and policy modals across index.html and checkout.html; implemented Pay on Delivery flow with phone number validation, "TEST STORE • PAY ON DELIVERY" badge, doorstep total highlight, and Mailgun confirmation email with `TOTAL DUE ON DELIVERY` banner.
