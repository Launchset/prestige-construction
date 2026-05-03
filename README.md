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

Shadow/front-end test deploys use `wrangler.shadow.jsonc`:

```bash
npm run preview:shadow
npm run deploy:shadow
```

Important shadow deployment note:
- `opennextjs-cloudflare build` runs `next build` before Wrangler applies `wrangler.shadow.jsonc` vars.
- If `/` fails to prerender with `Supabase public configuration is missing`, rerun the shadow deploy with the public build vars supplied in the shell.
- Use the shadow `SITE_URL`, not the production domain, when deploying the shadow Worker.

Known-good shadow deploy command:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xebgrcnxyyfltidieoqc.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY='<anon key from wrangler.shadow.jsonc>' \
NEXT_PUBLIC_ASSETS_BASE=https://assets.prestigekitchensandbedrooms.com \
SITE_URL=https://prestige-construction-shadow.jhelyar04.workers.dev \
npm run deploy:shadow
```

The successful shadow deploy on 2026-05-01 produced:

```txt
https://prestige-construction-shadow.jhelyar04.workers.dev
Version ID: a91cbec8-7bb5-4ae0-adbe-ed7ee5431904
```

Do not change `MAILJET_FROM_EMAIL` to `info@prestige-kitchens.com`; Mailjet sender verification expects `info@prestigekitchensandbedrooms.com`.

Shadow bug note from 2026-05-03:
- Symptom: `/appliances`, `/sinks-taps-sinks`, and other category pages returned `404` on the deployed shadow Worker even though the category rows existed in Supabase.
- Actual cause: the category lookup in `src/app/[category]/page.tsx` was using `.single()`. In the deployed Worker path that could fall through to `notFound()` even for real rows.
- Fix: change the category lookup to `.maybeSingle()` and redeploy shadow.
- Verification: after the fix, `/appliances` and `/sinks-taps-sinks` returned `200` on `https://prestige-construction-shadow.jhelyar04.workers.dev`.

Auth note from the same investigation:
- Symptom: browser console showed `401` on `auth/v1/token?grant_type=password` and `auth/v1/signup`.
- What to check first: do not assume the anon key is broken. Test the shipped anon key directly against Supabase `auth/v1/settings`, `auth/v1/signup`, and `auth/v1/token`.
- Result in this incident: direct Supabase auth calls returned `200`, so the public anon key and auth service were healthy. The category-page failure was separate from the auth issue.
- If the browser still shows `401` while direct auth calls succeed, try a hard refresh or an incognito window before changing Wrangler/Supabase config.

Files involved:
- `open-next.config.ts` defines the OpenNext Cloudflare adapter config.
- `wrangler.jsonc` points Wrangler at `.open-next/worker.js` and `.open-next/assets` and enables `nodejs_compat`.
- `wrangler.shadow.jsonc` deploys the isolated shadow Worker at the workers.dev URL.
- `src/lib/stripe/server.ts` contains the Worker-safe Stripe client configuration.

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

### Production Notes

- Production plain-text env vars are committed in `wrangler.jsonc` so deploys do not wipe them from Cloudflare.
- Production secrets still live in Cloudflare and must remain configured there:
  - `MAILJET_API_KEY`
  - `MAILJET_API_SECRET`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `SUPABASE_WEBHOOK_ADMIN_EMAIL`
  - `SUPABASE_WEBHOOK_ADMIN_PASSWORD`

### Stripe on Cloudflare Workers

Production checkout failed on Cloudflare because the Worker was creating the Stripe client with the default transport:

```ts
new Stripe(secretKey)
```

That can hang during `stripe.checkout.sessions.create(...)` in the Worker runtime.

The required production-safe fix is in `src/lib/stripe/server.ts`:

```ts
new Stripe(secretKey, {
  httpClient: Stripe.createFetchHttpClient(),
  maxNetworkRetries: 0,
  timeout: 20_000,
})
```

Rules:
- Do not switch the Stripe client back to the default constructor in production code.
- Keep `Stripe.createFetchHttpClient()` for Cloudflare Workers deployments.
- Keep the explicit timeout so checkout failures surface quickly in logs instead of hanging the browser on `Preparing secure checkout...`.

### Checkout Debugging

If checkout hangs on `Preparing secure checkout...`, tail the production Worker and look for `/api/create-checkout-session`.

- If there is no `POST /api/create-checkout-session`, the browser/form/auth flow is blocking before the server call.
- If there is a `500` with `Creating Stripe checkout session timed out`, the Stripe Worker client configuration is wrong or a live Stripe network call is hanging.
- If the route is redeployed and you still need the exact failing step, the timeout labels in `src/app/api/create-checkout-session/route.ts` identify which external call stalled.

### Deployment Fallback

If `npm run deploy` uploads a new Worker version but Cloudflare fails the final deployment step with API error `10013`, use Wrangler Versions to promote the uploaded version directly:

```bash
npx wrangler versions list --name prestige-construction
npx wrangler versions deploy <version-id>@100 --name prestige-construction -y --message "Deploy fix"
```

This was the successful fallback path for promoting the Stripe fix to production when the normal `workers/scripts/.../deployments` call returned a Cloudflare `500`.

## Documentation

- [Supabase auth schema](supabase/auth.sql)
- [Supabase orders schema](supabase/orders.sql)
- [Supabase enquiries schema](supabase/enquiries.sql)
- [Supabase migrations](supabase/migrations)
