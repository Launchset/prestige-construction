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

Enquiries are stored in `public.enquiries` using `supabase/enquiries.sql`. Apply `supabase/auth.sql` first if the database is new, then apply the enquiries SQL before using the enquiry form in any environment that does not already have the table.

## Supabase CLI

The Supabase CLI is installed in this project, but it is separate from any live access you may have through the Codex Supabase plugin.

- CLI installed locally: the `supabase` command works on this machine.
- CLI linked locally: this repo is attached to a remote Supabase project for commands like `db push`.
- Live plugin access: Codex can inspect or query a hosted project through the plugin, even when this repo is not linked with the CLI.

This repo is currently safe to keep unlinked until you intentionally want to run a CLI command against a remote project.

```bash
npm run supabase -- --version
npm run supabase:login
npm run supabase:logout
npm run supabase:link -- --project-ref <your-project-ref> -p <your-db-password>
npm run supabase:unlink
npm run supabase:db:push
```

Notes:
- `npm run supabase:logout` only removes CLI auth. It does not disconnect the Codex plugin.
- `npm run supabase:unlink` only detaches this repo from a remote project. It does not delete remote data.
- `npm run supabase:db:push:dry` shows what would be applied without changing the remote database.
- The repo now includes migration files under `supabase/migrations/` for `auth`, `orders`, and `enquiries`.
- If your remote project is missing `public.enquiries`, run `npm run supabase:db:push` after linking to apply it from this repo.

## Stripe Local Testing

Use the local Stripe CLI binary when testing webhooks:

```bash
/tmp/stripe-cli/stripe login
/tmp/stripe-cli/stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the printed `whsec_...` value into `.env.local` as `STRIPE_WEBHOOK_SECRET`.

## Documentation

- [Supabase auth schema](supabase/auth.sql)
- [Supabase orders schema](supabase/orders.sql)
- [Supabase enquiries schema](supabase/enquiries.sql)
- [Supabase migrations](supabase/migrations)
