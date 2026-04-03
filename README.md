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
SUPABASE_WEBHOOK_ADMIN_EMAIL=admin@example.com
SUPABASE_WEBHOOK_ADMIN_PASSWORD=your_admin_password
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SITE_URL=http://localhost:3000
NEXT_PUBLIC_ASSETS_BASE=https://your-asset-host.example
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
MAILJET_API_KEY=your_mailjet_api_key
MAILJET_API_SECRET=your_mailjet_secret_key
MAILJET_FROM_EMAIL=hello@yourdomain.com
MAILJET_FROM_NAME="Prestige Construction"
ENQUIRY_NOTIFICATION_EMAIL=your-inbox@example.com
```

Notes:
- `NEXT_PUBLIC_*` values are used by browser code.
- `SUPABASE_SERVICE_ROLE` is only for local data scripts and the local-only `/admin/image-review` route. Do not put it in Cloudflare production env vars.
- `SUPABASE_WEBHOOK_ADMIN_EMAIL` and `SUPABASE_WEBHOOK_ADMIN_PASSWORD` must belong to a Supabase user whose `profiles.role` is `admin`, so Stripe webhooks can update order status through RLS.
- `STRIPE_WEBHOOK_SECRET` comes from the Stripe CLI during local testing.
- `MAILJET_FROM_EMAIL` must be a sender address/domain verified in Mailjet before production use.

## Supabase Model

The app uses two access paths:
- Customer login/signup through Supabase Auth.
- Admin access through a `profiles.role = 'admin'` check.

Orders are attached to the signed-in account via `orders.user_id`. Customers can read their own orders, admins can read all orders, and the live schema/policies are captured in `supabase/auth.sql` and `supabase/orders.sql`.

Enquiries are stored in `public.enquiries` using `supabase/enquiries.sql`, and the same API route can send a Mailjet notification email when `MAILJET_API_KEY`, `MAILJET_API_SECRET`, `MAILJET_FROM_EMAIL`, and `ENQUIRY_NOTIFICATION_EMAIL` are set. Apply `supabase/auth.sql` first if the database is new, then apply the enquiries SQL before using the enquiry form in any environment that does not already have the table.

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
- `/admin/image-review` is intentionally hidden in production and only available in local development.

## Stripe Local Testing

Use the local Stripe CLI binary when testing webhooks:

```bash
/tmp/stripe-cli/stripe login
/tmp/stripe-cli/stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the printed `whsec_...` value into `.env.local` as `STRIPE_WEBHOOK_SECRET`.

## Cloudflare Deployment

This repo is wired for Cloudflare Workers through OpenNext.

```bash
npm run preview
npm run deploy
```

Files involved:
- `open-next.config.ts` defines the OpenNext Cloudflare adapter config.
- `wrangler.jsonc` points Wrangler at `.open-next/worker.js` and `.open-next/assets` and enables `nodejs_compat`.

Manual Cloudflare steps before first production deploy:
- Run `npx wrangler login` on this machine and complete the browser login flow. `wrangler whoami` currently reports `Not logged in`.
- Add your production environment variables/secrets in the Worker settings or with `wrangler secret put`, including:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_ASSETS_BASE`
  - `SUPABASE_WEBHOOK_ADMIN_EMAIL`
  - `SUPABASE_WEBHOOK_ADMIN_PASSWORD`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `SITE_URL`
  - `MAILJET_API_KEY`
  - `MAILJET_API_SECRET`
  - `MAILJET_FROM_EMAIL`
  - `MAILJET_FROM_NAME`
  - `ENQUIRY_NOTIFICATION_EMAIL`
- Do not add `SUPABASE_SERVICE_ROLE` to Cloudflare production.
- In Cloudflare Dashboard, attach your hostname to the Worker from Workers & Pages -> your Worker -> Settings -> Domains & Routes -> Add -> Custom Domain.

## Documentation

- [Supabase auth schema](supabase/auth.sql)
- [Supabase orders schema](supabase/orders.sql)
- [Supabase enquiries schema](supabase/enquiries.sql)
- [Supabase migrations](supabase/migrations)
