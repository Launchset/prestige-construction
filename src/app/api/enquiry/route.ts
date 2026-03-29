import { NextResponse } from "next/server";

type EnquiryPayload = {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  product?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as EnquiryPayload;
  const name = body.name?.trim() || "";
  const email = body.email?.trim() || "";
  const phone = body.phone?.trim() || "";
  const message = body.message?.trim() || "";
  const product = body.product?.trim() || "";

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "Name, email, and message are required." },
      { status: 400 }
    );
  }

  console.log("New enquiry received", {
    name,
    email,
    phone,
    message,
    product,
    receivedAt: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}
