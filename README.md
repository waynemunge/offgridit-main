# OffGridIt — Premium Tech E-Commerce Store (Kenya)

A full-stack e-commerce platform for selling phones, laptops, tablets, audio, wearables and accessories in Kenya. Built with TanStack Start, Supabase, and Tailwind CSS v4.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | TanStack Start (SSR React) |
| Database & Auth | Supabase (PostgreSQL + RLS) |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui + Radix UI |
| Email | Resend |
| Deployment | Vercel |
| Charts | Recharts |

---

## Features

### Storefront
- Product listing with search, sort and filter by category/price/rating
- Product detail page with image gallery, variants (storage/color), specs table
- Flash sale countdown timer on sale products
- Low stock urgency indicator (≤5 units)
- Breadcrumb navigation with JSON-LD schema
- Recently viewed products
- Product comparison (up to 3 products side by side)
- Wishlist (persisted to localStorage)
- Back-in-stock email notification subscription

### Cart & Checkout
- Persistent cart (localStorage + Supabase sync for signed-in users)
- Promo/discount code support
- M-Pesa and card payment options
- Order confirmation email via Resend
- Delivery notes field

### Authentication
- Email/password sign up and sign in
- Google OAuth (via Supabase)
- Auth state synced across tabs

### Admin Dashboard (`/admin`)
- Protected by `is_admin` flag — server-side and client-side enforced
- Order management with status updates and internal notes
- Product management — create, edit, delete, bulk stock update
- Multi-image gallery per product (upload or URL)
- Flash sale end time per product
- Customer overview
- Discount code manager (percentage or fixed, expiry, max uses, min order)
- Sales analytics with charts
- Low stock and out-of-stock alerts

### SEO & Marketing
- Sitemap at `/sitemap.xml`
- `robots.txt` configured
- JSON-LD structured data (Product + BreadcrumbList) on every product page
- Open Graph and Twitter Card meta tags
- Legal pages: Privacy Policy (KDPA 2019), Terms of Service, Refund Policy

### Notifications
- Order confirmation email to customer (Resend)
- Low stock alert email to admin when product hits 0
- Back-in-stock email to subscribers when stock is restored

---

## Project Structure

```
src/
├── components/
│   ├── auth/          # AuthModal (email + Google OAuth)
│   ├── cart/          # CartDrawer
│   ├── layout/        # Header, Footer, WhatsAppButton, CompareBar
│   ├── product/       # ProductCard, CountdownTimer, CompareBar
│   └── ui/            # shadcn/ui components
├── lib/
│   ├── api/           # Server functions (admin, discount, notifications, reviews)
│   ├── auth-context.tsx
│   ├── cart-context.tsx
│   ├── compare-context.tsx
│   ├── wishlist-context.tsx
│   ├── theme-context.tsx
│   ├── products.ts
│   ├── types.ts
│   └── format.ts
├── routes/
│   ├── index.tsx      # Homepage
│   ├── shop.tsx       # Product listing
│   ├── product.$slug.tsx  # Product detail
│   ├── cart.tsx
│   ├── checkout.tsx
│   ├── wishlist.tsx
│   ├── compare.tsx
│   ├── admin.tsx      # Admin dashboard
│   ├── orders.tsx     # Customer order history
│   ├── privacy.tsx
│   ├── terms.tsx
│   ├── refund.tsx
│   └── sitemap[.]xml.ts
└── integrations/
    └── supabase/      # Client, server client, auth middleware
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```env
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_PROJECT_ID=
SUPABASE_SERVICE_ROLE_KEY=      # Server only — never expose to client
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
RESEND_API_KEY=                 # For order confirmation + admin alert emails
RESEND_FROM_EMAIL=              # Optional — defaults to onboarding@resend.dev
ADMIN_EMAIL=                    # Email address for admin alert notifications
```

> **Never commit `.env` to git.** It is listed in `.gitignore`.

---

## Local Development

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`.

---

## Database Setup

There are two Supabase projects:

| Project | Used by | Data |
|---|---|---|
| **Live** (`ylvvnbpzjmkjcekzfucu`) | Production — `main` → www.offgridit.store | Real orders and stock |
| **Test** | Every Vercel preview (any other branch) | Test data only — safe to break |

The whole schema lives in `supabase/migrations/`. To set up an empty project (e.g. a new test database):

```bash
npm run db:bundle   # writes supabase/.bundle/setup.sql
```

Paste `supabase/.bundle/setup.sql` into that project's SQL Editor and run it once.

**Changing the schema:** add a new file to `supabase/migrations/`, run it on the **test** project, check the preview, then run it on the **live** project **before** merging the pull request.

---

## Deployment

The app is pre-configured for Vercel (`nitro: { preset: "vercel" }` in `vite.config.ts`).

- Every branch gets a **preview** deployment, connected to the **test** database.
- `main` is protected: changes arrive through a pull request once the **Lint, type check, build** check passes, and Vercel deploys them to production.

Environment variables are in **Vercel → Project → Settings → Environment Variables**. The Supabase variables have separate values for **Production** (live project) and **Preview** (test project).

---

## Admin Access

1. Sign up or sign in on the site (live, or a preview for the test database — each database has its own accounts)
2. In that Supabase project → Table Editor → `profiles`, set `is_admin = true` for your user row
3. Visit `/admin`

---

## Google OAuth Setup

1. Google Cloud Console → Create OAuth Client ID (Web application)
2. Add to **Authorized JavaScript origins**: your site URL
3. Add to **Authorized redirect URIs**: `https://<your-supabase-project>.supabase.co/auth/v1/callback`
4. Supabase → Authentication → Providers → Google → paste Client ID and Secret

---

## WhatsApp Support

The floating WhatsApp button links to `+254702699933`. To change the number update `src/components/layout/WhatsAppButton.tsx`.

---

## License

Private — OffGridIt. All rights reserved.
