import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getCheckoutProductBySlug } from "@/lib/products";
import { getStripeClient } from "@/lib/stripe/server";

type CheckoutPayload = {
  productSlug?: string;
  name?: string;
  phone?: string;
  address?: string;
  addressNumber?: string;
  road?: string;
  townCity?: string;
  county?: string;
  postcode?: string;
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
  shipping_address_number: string;
  shipping_road: string;
  shipping_town_city: string;
  shipping_county: string;
  shipping_postcode: string;
  status: string;
  user_id: string;
  stripe_payment_status: string;
  updated_at: string;
};

type OrderRecord = {
  id: string;
  created_at: string;
  stripe_session_id: string | null;
  status: string;
};

type MutationResult<T> = {
  data: T;
  error: unknown;
};

type AccessTokenClaims = {
  sub?: string;
  email?: string;
  exp?: number;
};

function decodeBase64UrlJson<T>(value: string): T | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
    const decoded = atob(`${normalized}${padding}`);
    return JSON.parse(decoded) as T;
  } catch {
    return null;
  }
}

function getAccessTokenClaims(accessToken: string): AccessTokenClaims | null {
  const [, payload] = accessToken.split(".");
  if (!payload) {
    return null;
  }

  return decodeBase64UrlJson<AccessTokenClaims>(payload);
}

async function withTimeout<T>(label: string, promise: PromiseLike<T>, timeoutMs = 15_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race<T>([
      Promise.resolve(promise),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizePostcode(postcode: string) {
  return postcode.trim().replace(/\s+/g, " ").toUpperCase();
}

function formatShippingAddress(address: {
  addressNumber: string;
  road: string;
  townCity: string;
  county: string;
  postcode: string;
}) {
  return [
    `${address.addressNumber} ${address.road}`.trim(),
    address.townCity,
    address.county,
    address.postcode,
  ]
    .filter(Boolean)
    .join(", ");
}

function buildCheckoutFingerprint(input: {
  userId: string;
  productId: string;
  productSlug: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}) {
  return createHash("sha256")
    .update([
      input.userId,
      input.productId,
      input.productSlug,
      input.name,
      input.email,
      input.phone,
      input.address,
    ].join("\n"))
    .digest("hex");
}

async function loadOpenCheckoutSession(stripe: ReturnType<typeof getStripeClient>, sessionId: string) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.status !== "open" || !session.url) {
      return null;
    }

    return session;
  } catch (error) {
    console.warn("Unable to reuse existing Stripe session", { sessionId, error });
    return null;
  }
}

async function findRecentMatchingOrder(
  supabase: ReturnType<typeof createClient>,
  criteria: {
    userId: string;
    productId: string;
    productSlug: string;
    name: string;
    email: string;
    phone: string;
    address: string;
  },
) {
  const recentCutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("orders")
    .select("id, created_at, stripe_session_id, status")
    .eq("user_id", criteria.userId)
    .eq("product_id", criteria.productId)
    .eq("product_slug", criteria.productSlug)
    .eq("customer_name", criteria.name)
    .eq("customer_email", criteria.email)
    .eq("customer_phone", criteria.phone)
    .eq("shipping_address", criteria.address)
    .in("status", ["pending", "checkout_failed"])
    .gte("created_at", recentCutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as OrderRecord | null) ?? null;
}

async function loadMatchingSessionOrder(
  supabase: ReturnType<typeof createClient>,
  stripeSessionId: string,
) {
  const { data, error } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_session_id", stripeSessionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as { id: string } | null;
}

export async function POST(request: Request) {
  let accessToken = "";
  let orderId: string | null = null;

  try {
    const authHeader = request.headers.get("authorization") || "";
    accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    if (!accessToken) {
      return NextResponse.json(
        { error: "Please login before starting checkout." },
        { status: 401 }
      );
    }

    const supabase = createClient({ accessToken });
    const tokenClaims = getAccessTokenClaims(accessToken);
    const tokenExpired = typeof tokenClaims?.exp === "number" && tokenClaims.exp * 1000 <= Date.now();
    const authenticatedUser = tokenClaims?.sub
      ? {
          id: tokenClaims.sub,
          email: tokenClaims.email ?? "",
        }
      : null;

    if (!authenticatedUser || tokenExpired) {
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
    const addressNumber = body.addressNumber?.trim() || "";
    const road = body.road?.trim() || "";
    const townCity = body.townCity?.trim() || "";
    const county = body.county?.trim() || "";
    const postcode = normalizePostcode(body.postcode || "");
    const legacyAddress = body.address?.trim() || "";
    const address = legacyAddress || formatShippingAddress({
      addressNumber,
      road,
      townCity,
      county,
      postcode,
    });

    if (
      !productSlug ||
      !name ||
      !email ||
      !phone ||
      !address ||
      (!legacyAddress && (!addressNumber || !road || !townCity || !county || !postcode))
    ) {
      return NextResponse.json(
        { error: "Product, name, phone, and full delivery address are required." },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Your signed-in account email is invalid. Please sign in again." },
        { status: 400 }
      );
    }

    const product = await withTimeout(
      "Loading checkout product",
      getCheckoutProductBySlug(productSlug),
    );

    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    if (typeof product.priceInPence !== "number" || product.priceInPence <= 0) {
      return NextResponse.json(
        { error: "This product is not currently available for direct checkout." },
        { status: 400 }
      );
    }

    const stripe = getStripeClient();
    const now = new Date().toISOString();
    const checkoutFingerprint = buildCheckoutFingerprint({
      userId: authenticatedUser.id,
      productId: product.id,
      productSlug: product.slug,
      name,
      email,
      phone,
      address,
    });

    let order: OrderRecord | null = await withTimeout("Finding recent matching order", findRecentMatchingOrder(supabase, {
      userId: authenticatedUser.id,
      productId: product.id,
      productSlug: product.slug,
      name,
      email,
      phone,
      address,
    }));

    if (order?.stripe_session_id) {
      const existingSession = await withTimeout(
        "Loading existing Stripe session",
        loadOpenCheckoutSession(stripe, order.stripe_session_id),
        20_000,
      );

      if (existingSession?.url) {
        return NextResponse.json({
          checkoutUrl: existingSession.url,
          orderId: order.id,
        });
      }
    }

    if (!order) {
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
        shipping_address_number: addressNumber,
        shipping_road: road,
        shipping_town_city: townCity,
        shipping_county: county,
        shipping_postcode: postcode,
        status: "pending",
        stripe_payment_status: "unpaid",
        updated_at: now,
      };

      const insertResult = await withTimeout(
        "Creating order",
        supabase
          .from("orders")
          .insert(orderPayload)
          .select("id, created_at, stripe_session_id, status")
          .single(),
      ) as MutationResult<OrderRecord | null>;
      const { data: insertedOrder, error: orderError } = insertResult;

      if (orderError || !insertedOrder) {
        console.error("Failed to create order", orderError);
        return NextResponse.json(
          { error: "Unable to create your order. Please try again." },
          { status: 500 }
        );
      }

      order = insertedOrder as OrderRecord;
      orderId = order.id;

      const duplicateOrder = await withTimeout(
        "Checking duplicate order",
        supabase
          .from("orders")
          .select("id, created_at, stripe_session_id, status")
          .eq("user_id", authenticatedUser.id)
          .eq("product_id", product.id)
          .eq("product_slug", product.slug)
          .eq("customer_name", name)
          .eq("customer_email", email)
          .eq("customer_phone", phone)
          .eq("shipping_address", address)
          .in("status", ["pending", "checkout_failed"])
          .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
          .neq("id", order.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ) as MutationResult<OrderRecord | null>;

      if (duplicateOrder.error) {
        throw duplicateOrder.error;
      }

      if (duplicateOrder.data) {
        const survivingOrder = duplicateOrder.data as OrderRecord;
        await supabase.from("orders").delete().eq("id", order.id);
        order = survivingOrder;
        orderId = survivingOrder.id;
      }
    }

    if (!order) {
      return NextResponse.json(
        { error: "Unable to prepare your order. Please try again." },
        { status: 500 }
      );
    }

    const reuseOpenSession = order.stripe_session_id
      ? await withTimeout(
          "Reusing open Stripe session",
          loadOpenCheckoutSession(stripe, order.stripe_session_id),
          20_000,
        )
      : null;

    if (reuseOpenSession?.url) {
      return NextResponse.json({
        checkoutUrl: reuseOpenSession.url,
        orderId: order.id,
      });
    }

    const idempotencyKey = order.stripe_session_id
      ? `${checkoutFingerprint}:${order.id}:${order.stripe_session_id}`
      : checkoutFingerprint;

    await withTimeout(
      "Updating order before Stripe checkout",
      supabase
        .from("orders")
        .update({
          status: "pending",
          stripe_payment_status: "unpaid",
          updated_at: now,
        })
        .eq("id", order.id),
    );

    orderId = order.id;

    const requestUrl = new URL(request.url);
    const siteUrl = process.env.SITE_URL?.replace(/\/+$/, "") || requestUrl.origin;
    const session = await withTimeout(
      "Creating Stripe checkout session",
      stripe.checkout.sessions.create(
        {
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
            checkoutFingerprint,
          },
        },
        { idempotencyKey }
      ),
      20_000,
    );

    const sessionUpdateResult = await withTimeout(
      "Attaching Stripe session to order",
      supabase
        .from("orders")
        .update({
          stripe_session_id: session.id,
          stripe_payment_status: session.payment_status,
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id),
    ) as MutationResult<unknown>;
    const { error: sessionUpdateError } = sessionUpdateResult;

    if (sessionUpdateError) {
      const existingOrder = await withTimeout(
        "Loading existing order for Stripe session",
        loadMatchingSessionOrder(supabase, session.id),
      );

      if (existingOrder && existingOrder.id !== order.id) {
        await supabase.from("orders").delete().eq("id", order.id);
        return NextResponse.json({
          checkoutUrl: session.url,
          orderId: existingOrder.id,
        });
      }

      console.error("Failed to attach Stripe session to order", sessionUpdateError);
    }

    return NextResponse.json({
      checkoutUrl: session.url,
      orderId: order.id,
    });
  } catch (error) {
    console.error("Checkout session creation failed", error);

    if (orderId && accessToken) {
      const supabase = createClient({ accessToken });
      await supabase
        .from("orders")
        .update({
          status: "checkout_failed",
          stripe_payment_status: "failed",
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
