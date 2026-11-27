// Sale pricing at Stripe checkout. We charge the regular price with a "Sale
// price" discount on top, so the payment page shows the regular price, the
// discount, and the total — the same story the website tells.

import { stripe } from "./stripe";

// A reusable Stripe coupon for a fixed amount off (one per amount + duration,
// so the Stripe dashboard doesn't fill up with one coupon per purchase).
async function saleCoupon(
  amountOffCents: number,
  duration: "once" | "forever"
): Promise<string | null> {
  if (!stripe || amountOffCents <= 0) return null;
  const id = `dwell-sale-${amountOffCents}-${duration}`;
  try {
    const c = await stripe.coupons.retrieve(id);
    if (c.valid) return c.id;
  } catch {
    // Not created yet.
  }
  try {
    const c = await stripe.coupons.create({
      id,
      amount_off: amountOffCents,
      currency: "usd",
      duration,
      name: "Sale price",
    });
    return c.id;
  } catch {
    // Created by a simultaneous checkout a moment ago?
    try {
      return (await stripe.coupons.retrieve(id)).id;
    } catch {
      return null;
    }
  }
}

// How to price a checkout line. Without a sale: the regular price, and the
// buyer can still enter a promo code. With a sale: regular price + the sale
// discount (Stripe allows one or the other, so no promo codes on top of a sale).
//
// Subscriptions: `lockedIn` keeps the discount on every renewal; otherwise it
// applies to the first month only.
export async function salePricing(opts: {
  fullCents: number;
  saleCents: number | null;
  quantity?: number;
  subscription?: boolean;
  lockedIn?: boolean;
}): Promise<
  | {
      ok: true;
      unitAmount: number;
      discounts?: { coupon: string }[];
      allowPromotionCodes: boolean;
    }
  | { ok: false; error: string }
> {
  const qty = opts.quantity ?? 1;
  if (opts.saleCents == null || opts.saleCents >= opts.fullCents)
    return { ok: true, unitAmount: opts.fullCents, allowPromotionCodes: true };

  const coupon = await saleCoupon(
    (opts.fullCents - opts.saleCents) * qty,
    opts.subscription && opts.lockedIn ? "forever" : "once"
  );
  if (coupon)
    return {
      ok: true,
      unitAmount: opts.fullCents,
      discounts: [{ coupon }],
      allowPromotionCodes: false,
    };

  // Couldn't set up the discount. One-time purchases (and locked-in
  // memberships) can simply be charged the sale price; a first-month-only
  // sale can't, or every month would be discounted.
  if (opts.subscription && !opts.lockedIn)
    return {
      ok: false,
      error: "We couldn't apply the sale price just now — please try again.",
    };
  return { ok: true, unitAmount: opts.saleCents, allowPromotionCodes: false };
}
