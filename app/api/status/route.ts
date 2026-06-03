import { NextResponse } from "next/server";
import { stripeEnabled, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { emailConfigured, smsConfigured } from "@/lib/messaging";

// Public health/status check — reports which integrations are configured.
// Returns only booleans (never any secret values), so it's safe to expose.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    payments: stripeEnabled(),
    paymentsWebhook: Boolean(STRIPE_WEBHOOK_SECRET),
    email: emailConfigured(),
    sms: smsConfigured(),
  });
}

