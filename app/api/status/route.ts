import { NextResponse } from "next/server";
import { stripeEnabled } from "@/lib/stripe";
import { emailConfigured, smsConfigured } from "@/lib/messaging";

// Public health/status check — reports which integrations are configured.
// Returns only booleans (never any secret values), so it's safe to expose.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    payments: stripeEnabled(),
    email: emailConfigured(),
    sms: smsConfigured(),
  });
}
