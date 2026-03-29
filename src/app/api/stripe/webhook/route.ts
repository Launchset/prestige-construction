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

async function markOrderPaid(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId || session.client_reference_id || "";

  if (!orderId) {
    console.error("Stripe webhook missing order reference", {
      sessionId: session.id,
    });
    return;
  }

  const supabase = createClient();
  const paidAt = typeof session.created === "number"
    ? new Date(session.created * 1000).toISOString()
    : new Date().toISOString();

  const { error } = await supabase
    .from("orders")
    .update({
      status: session.payment_status === "paid" ? "paid" : "pending",
      stripe_session_id: session.id,
      stripe_payment_status: session.payment_status,
      paid_at: session.payment_status === "paid" ? paidAt : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    throw new Error(error.message);
  }
}

async function markOrderCancelled(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId || session.client_reference_id || "";

  if (!orderId) {
    return;
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("orders")
    .update({
      status: "cancelled",
      stripe_session_id: session.id,
      stripe_payment_status: session.payment_status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .neq("status", "paid");

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
        await markOrderPaid(event.data.object as Stripe.Checkout.Session);
        break;
      case "checkout.session.expired":
        await markOrderCancelled(event.data.object as Stripe.Checkout.Session);
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
