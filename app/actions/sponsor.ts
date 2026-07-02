"use server";

import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { stripe, stripeEnabled } from "@/lib/stripe";

function siteOrigin(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

// Start a "Sponsor a Sister" donation checkout — any amount, one-time or monthly.
export async function startDonation(amountDollars: number, recurring: boolean) {
  if (!stripeEnabled())
    return { ok: false, error: "Donations aren't available right now." };

  const cents = Math.round((amountDollars || 0) * 100);
  if (!cents || cents < 100)
    return { ok: false, error: "Please enter an amount of at least $1." };

  const user = await getCurrentUser();
  const origin = siteOrigin();

  const session = await stripe!.checkout.sessions.create({
    mode: recurring ? "subscription" : "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: cents,
          product_data: {
            name: recurring ? "Sponsor a Sister (monthly)" : "Sponsor a Sister",
            description: "A donation supporting sponsored memberships at Dwell Studio.",
          },
          ...(recurring ? { recurring: { interval: "month" as const } } : {}),
        },
      },
    ],
    ...(user?.email ? { customer_email: user.email } : {}),
    metadata: { kind: "donation" },
    ...(recurring
      ? { subscription_data: { metadata: { kind: "donation" } } }
      : {}),
    success_url: `${origin}/sponsor?status=thanks`,
    cancel_url: `${origin}/sponsor`,
  });

  return { ok: true, url: session.url };
}
