import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type EnquiryPayload = {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  product?: string;
};

type EnquiryInsert = {
  name: string;
  email: string;
  phone: string;
  message: string;
  product: string;
};

type StoredEnquiry = EnquiryInsert & {
  id: string;
  created_at: string;
};

type MailjetConfiguration = {
  apiKey: string;
  apiSecret: string;
  toEmail: string;
  fromEmail: string;
  fromName: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStorageUnavailableError(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  const message = (error.message || "").toLowerCase();

  return (
    error.code === "42P01" ||
    message.includes("schema cache") ||
    message.includes("could not find the table")
  );
}

function getStorageConfigurationError() {
  const missing: string[] = [];

  if (!process.env.SUPABASE_URL) {
    missing.push("SUPABASE_URL");
  }

  if (!process.env.SUPABASE_SERVICE_ROLE) {
    missing.push("SUPABASE_SERVICE_ROLE");
  }

  if (!missing.length) {
    return null;
  }

  return `Missing Supabase configuration: ${missing.join(", ")}.`;
}

function getMailjetConfiguration(): MailjetConfiguration | null {
  const apiKey = process.env.MAILJET_API_KEY?.trim();
  const apiSecret = process.env.MAILJET_API_SECRET?.trim();
  const fromEmail = process.env.MAILJET_FROM_EMAIL?.trim();
  const fromName = process.env.MAILJET_FROM_NAME?.trim() || "Prestige Construction";
  const toEmail = process.env.ENQUIRY_NOTIFICATION_EMAIL?.trim();

  if (!apiKey || !apiSecret || !fromEmail || !toEmail) {
    return null;
  }

  return { apiKey, apiSecret, fromEmail, fromName, toEmail };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function sendEnquiryNotification(enquiry: StoredEnquiry) {
  const mailjetConfig = getMailjetConfiguration();

  if (!mailjetConfig) {
    return;
  }

  const safeName = escapeHtml(enquiry.name);
  const safeEmail = escapeHtml(enquiry.email);
  const safePhone = escapeHtml(enquiry.phone || "Not provided");
  const safeProduct = escapeHtml(enquiry.product || "General enquiry");
  const safeMessage = escapeHtml(enquiry.message).replaceAll("\n", "<br />");

  try {
    const response = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${mailjetConfig.apiKey}:${mailjetConfig.apiSecret}`,
        ).toString("base64")}`,
        "Content-Type": "application/json",
        "User-Agent": "prestige-construction/1.0",
      },
      body: JSON.stringify({
        Messages: [
          {
            From: {
              Email: mailjetConfig.fromEmail,
              Name: mailjetConfig.fromName,
            },
            To: [
              {
                Email: mailjetConfig.toEmail,
                Name: mailjetConfig.fromName,
              },
            ],
            ReplyTo: {
              Email: enquiry.email,
              Name: enquiry.name,
            },
            Subject: `New enquiry: ${enquiry.product || enquiry.name}`,
            HTMLPart: `
              <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;">
                <h1 style="font-size:22px;margin:0 0 16px;">New website enquiry</h1>
                <p><strong>Reference:</strong> ${escapeHtml(enquiry.id)}</p>
                <p><strong>Submitted:</strong> ${escapeHtml(enquiry.created_at)}</p>
                <p><strong>Product:</strong> ${safeProduct}</p>
                <p><strong>Name:</strong> ${safeName}</p>
                <p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
                <p><strong>Phone:</strong> ${safePhone}</p>
                <div style="margin-top:20px;padding:16px;background:#f7f7f7;border-radius:12px;">
                  <strong>Message</strong>
                  <p style="margin:12px 0 0;">${safeMessage}</p>
                </div>
              </div>
            `,
            TextPart: [
              "New website enquiry",
              `Reference: ${enquiry.id}`,
              `Submitted: ${enquiry.created_at}`,
              `Product: ${enquiry.product || "General enquiry"}`,
              `Name: ${enquiry.name}`,
              `Email: ${enquiry.email}`,
              `Phone: ${enquiry.phone || "Not provided"}`,
              "",
              enquiry.message,
            ].join("\n"),
          },
        ],
      }),
    });

    if (response.ok) {
      return;
    }

    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    console.error("Failed to send enquiry notification via Mailjet", {
      enquiryId: enquiry.id,
      status: response.status,
      message: payload?.message || response.statusText,
    });
  } catch (error) {
    console.error("Unable to reach Mailjet for enquiry notification", {
      enquiryId: enquiry.id,
      error,
    });
  }
}

export async function POST(request: Request) {
  let body: EnquiryPayload;

  try {
    body = (await request.json()) as EnquiryPayload;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const name = body.name?.trim() || "";
  const email = body.email?.trim().toLowerCase() || "";
  const phone = body.phone?.trim() || "";
  const message = body.message?.trim() || "";
  const product = body.product?.trim() || "";

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "Name, email, and message are required." },
      { status: 400 }
    );
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const configurationError = getStorageConfigurationError();

  if (configurationError) {
    return NextResponse.json(
      {
        error:
          `${configurationError} Apply supabase/auth.sql and supabase/enquiries.sql before enabling enquiries.`,
      },
      { status: 503 }
    );
  }

  const supabase = createClient();
  const enquiryPayload: EnquiryInsert = {
    name,
    email,
    phone,
    message,
    product,
  };

  const { data: enquiry, error } = await supabase
    .from("enquiries")
    .insert(enquiryPayload)
    .select("id, name, email, phone, message, product, created_at")
    .single<StoredEnquiry>();

  if (error) {
    console.error("Failed to persist enquiry", {
      code: error.code,
      message: error.message,
    });

    if (isStorageUnavailableError(error)) {
      return NextResponse.json(
        {
          error:
            "Enquiry storage is not configured yet. Apply supabase/enquiries.sql before using this form.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Unable to save your enquiry right now. Please try again." },
      { status: 500 }
    );
  }

  if (enquiry) {
    await sendEnquiryNotification(enquiry);
  }

  return NextResponse.json({ success: true, enquiryId: enquiry?.id ?? null }, { status: 201 });
}
