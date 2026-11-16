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

export type DonationGift =
  | { type: "RECIPIENT"; firstName: string; lastName: string; phone: string }
  | { type: "ANONYMOUS" };

// Start a "Sponsor a Sister" donation checkout — any amount, one-time or monthly.
// The donor says who it's for: a specific person (name + phone), or an
// anonymous sponsorship the studio assigns.
export async function startDonation(
  amountDollars: number,
  recurring: boolean,
  gift?: DonationGift
) {
  if (!stripeEnabled())
    return { ok: false, error: "Donations aren't available right now." };

  const cents = Math.round((amountDollars || 0) * 100);
  if (!cents || cents < 100)
    return { ok: false, error: "Please enter an amount of at least $1." };

  if (!gift)
    return { ok: false, error: "Please choose who this gift is for." };

  // Stored on the checkout (and subscription, for monthly gifts) so the
  // webhook can record it on the donation.
  let giftMeta: Record<string, string>;
  if (gift.type === "RECIPIENT") {
    const firstName = gift.firstName.trim().slice(0, 80);
    const lastName = gift.lastName.trim().slice(0, 80);
    const phone = gift.phone.trim().slice(0, 40);
    if (!firstName || !lastName)
      return { ok: false, error: "Please enter her first and last name." };
    if (phone.replace(/\D/g, "").length < 7)
      return { ok: false, error: "Please enter a valid phone number for her." };
    giftMeta = {
      giftFor: "RECIPIENT",
      recipientFirstName: firstName,
      recipientLastName: lastName,
      recipientPhone: phone,
    };
  } else {
    giftMeta = { giftFor: "ANONYMOUS" };
  }

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
    metadata: { kind: "donation", ...giftMeta },
    ...(recurring
      ? { subscription_data: { metadata: { kind: "donation", ...giftMeta } } }
      : {}),
    success_url: `${origin}/sponsor?status=thanks`,
    cancel_url: `${origin}/sponsor`,
  });

  return { ok: true, url: session.url };
}
