import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      httpClient: Stripe.createFetchHttpClient(),
      maxNetworkRetries: 0,
      timeout: 20_000,
    });
  }

  return stripeClient;
}
