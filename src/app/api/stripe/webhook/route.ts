import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe/server";

function getWebhookSecret() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET environment variable.");
  }

  return webhookSecret;
}

function getOrderReference(session: Stripe.Checkout.Session) {
  return session.metadata?.orderId || session.client_reference_id || "";
}

async function updateOrderFromSession(
  session: Stripe.Checkout.Session,
  update: {
    status: "paid" | "pending" | "cancelled" | "checkout_failed";
    paidAt?: string | null;
    preservePaid?: boolean;
  },
) {
  const orderId = getOrderReference(session);

  if (!orderId) {
    console.error("Stripe webhook missing order reference", {
      sessionId: session.id,
    });
    return;
  }

  const supabase = createClient();

  let query = supabase
    .from("orders")
    .update({
      status: update.status,
      stripe_session_id: session.id,
      stripe_payment_status: session.payment_status,
      paid_at: update.paidAt ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (update.preservePaid) {
    query = query.neq("status", "paid");
  }

  const { error } = await query;

  if (error) {
    throw new Error(error.message);
  }
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, getWebhookSecret());
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error);
    return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        {
          const session = event.data.object as Stripe.Checkout.Session;

          await updateOrderFromSession(session, {
            status: "paid",
            paidAt: typeof session.created === "number"
              ? new Date(session.created * 1000).toISOString()
              : new Date().toISOString(),
          });
        }
        break;
      case "checkout.session.async_payment_failed":
        await updateOrderFromSession(event.data.object as Stripe.Checkout.Session, {
          status: "checkout_failed",
          preservePaid: true,
        });
        break;
      case "checkout.session.expired":
        await updateOrderFromSession(event.data.object as Stripe.Checkout.Session, {
          status: "cancelled",
          preservePaid: true,
        });
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", {
      type: event.type,
      error,
    });
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
