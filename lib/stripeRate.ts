// What a member's Stripe subscription actually charges each month: the price
// on their subscription (fixed when they signed up — later plan price changes
// don't touch it) minus any discount that lasts forever (a "locked in" sale).

import { stripe } from "./stripe";

export async function stripeMonthlyRate(subscriptionId: string): Promise<number | null> {
  if (!stripe) return null;
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["discounts"] });
    const unit = sub.items.data[0]?.price?.unit_amount;
    if (unit == null) return null;
    let rate = unit;
    for (const d of (sub.discounts ?? []) as any[]) {
      if (!d || typeof d === "string") continue;
      let coupon = d.coupon ?? d.source?.coupon;
      if (typeof coupon === "string") coupon = await stripe.coupons.retrieve(coupon);
      if (!coupon || coupon.duration !== "forever") continue;
      if (coupon.amount_off) rate -= coupon.amount_off;
      else if (coupon.percent_off) rate = Math.round(rate * (1 - coupon.percent_off / 100));
    }
    return Math.max(0, rate);
  } catch {
    return null;
  }
}
