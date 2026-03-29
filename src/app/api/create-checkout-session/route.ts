import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCheckoutProductBySlug } from "@/lib/products";
import { getStripeClient } from "@/lib/stripe/server";
import { createPublicClient } from "@/lib/supabase/public";

type CheckoutPayload = {
  productSlug?: string;
  name?: string;
  phone?: string;
  address?: string;
};

type OrderInsert = {
  product_id: string;
  product_slug: string;
  product_name: string;
  product_sku: string;
  unit_amount_pence: number;
  currency: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  status: string;
  user_id: string;
  stripe_payment_status: string;
  updated_at: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  let orderId: string | null = null;

  try {
    const authHeader = request.headers.get("authorization") || "";
    const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    if (!accessToken) {
      return NextResponse.json(
        { error: "Please login before starting checkout." },
        { status: 401 }
      );
    }

    const publicSupabase = createPublicClient();
    const { data: authData, error: authError } = await publicSupabase.auth.getUser(accessToken);
    const authenticatedUser = authData.user ?? null;

    if (authError || !authenticatedUser) {
      return NextResponse.json(
        { error: "Your login session could not be verified. Please sign in again." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as CheckoutPayload;
    const productSlug = body.productSlug?.trim() || "";
    const name = body.name?.trim() || "";
    const email = authenticatedUser.email?.trim().toLowerCase() || "";
    const phone = body.phone?.trim() || "";
    const address = body.address?.trim() || "";

    if (!productSlug || !name || !email || !phone || !address) {
      return NextResponse.json(
        { error: "Product, name, phone, and address are required." },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Your signed-in account email is invalid. Please sign in again." },
        { status: 400 }
      );
    }

    const product = await getCheckoutProductBySlug(productSlug);

    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    if (typeof product.priceInPence !== "number" || product.priceInPence <= 0) {
      return NextResponse.json(
        { error: "This product is not currently available for direct checkout." },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const now = new Date().toISOString();
    const orderPayload: OrderInsert = {
      product_id: product.id,
      product_slug: product.slug,
      product_name: product.name,
      product_sku: product.sku,
      unit_amount_pence: product.priceInPence,
      currency: "gbp",
      user_id: authenticatedUser.id,
      customer_name: name,
      customer_email: email,
      customer_phone: phone,
      shipping_address: address,
      status: "pending",
      stripe_payment_status: "unpaid",
      updated_at: now,
    };

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert(orderPayload)
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("Failed to create order", orderError);
      return NextResponse.json(
        { error: "Unable to create your order. Please try again." },
        { status: 500 }
      );
    }

    orderId = order.id;

    const stripe = getStripeClient();
    const requestUrl = new URL(request.url);
    const siteUrl = process.env.SITE_URL?.replace(/\/+$/, "") || requestUrl.origin;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: order.id,
      customer_email: email,
      success_url: `${siteUrl}/checkout/success?order_id=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout/${product.slug}?cancelled=1`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: product.priceInPence,
            product_data: {
              name: product.name,
              metadata: {
                productId: product.id,
                productSlug: product.slug,
              },
            },
          },
        },
      ],
      metadata: {
        orderId: order.id,
        productId: product.id,
        productSlug: product.slug,
      },
    });

    const { error: sessionUpdateError } = await supabase
      .from("orders")
      .update({
        stripe_session_id: session.id,
        stripe_payment_status: session.payment_status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (sessionUpdateError) {
      console.error("Failed to attach Stripe session to order", sessionUpdateError);
    }

    return NextResponse.json({
      checkoutUrl: session.url,
      orderId: order.id,
    });
  } catch (error) {
    console.error("Checkout session creation failed", error);

    if (orderId) {
      const supabase = createClient();
      await supabase
        .from("orders")
        .update({
          status: "checkout_failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);
    }

    return NextResponse.json(
      { error: "Unable to start secure checkout. Please try again." },
      { status: 500 }
    );
  }
}
