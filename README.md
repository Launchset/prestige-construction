# Prestige Construction

Next.js app for product browsing, account login, checkout, Stripe payment, and order tracking.

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Required Environment Variables

Set these in `.env.local` for local development:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE=your_service_role_key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SITE_URL=http://localhost:3000
NEXT_PUBLIC_ASSETS_BASE=https://your-asset-host.example
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Notes:
- `NEXT_PUBLIC_*` values are used by browser code.
- `SUPABASE_SERVICE_ROLE` stays server-only.
- `STRIPE_WEBHOOK_SECRET` comes from the Stripe CLI during local testing.

## Supabase Model

The app uses two access paths:
- Customer login/signup through Supabase Auth.
- Admin access through a `profiles.role = 'admin'` check.

Orders are attached to the signed-in account via `orders.user_id`. Customers can read their own orders, admins can read all orders, and the live schema/policies are captured in `supabase/auth.sql` and `supabase/orders.sql`.

## Stripe Local Testing

Use the local Stripe CLI binary when testing webhooks:

```bash
/tmp/stripe-cli/stripe login
/tmp/stripe-cli/stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the printed `whsec_...` value into `.env.local` as `STRIPE_WEBHOOK_SECRET`.

## Documentation

- [Local setup and flows](docs/local-setup.md)
- [Manual verification checklist](docs/verification-checklist.md)

