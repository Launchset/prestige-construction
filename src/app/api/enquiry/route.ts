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

  const { error } = await supabase.from("enquiries").insert(enquiryPayload);

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

  return NextResponse.json({ success: true }, { status: 201 });
}
