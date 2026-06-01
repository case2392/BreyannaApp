import Stripe from "stripe";

// A single Stripe client, created only when a secret key is configured.
// When unset, the app runs in "no-payments" mode (memberships are granted
// instantly) so everything keeps working without Stripe.

const KEY = process.env.STRIPE_SECRET_KEY;

export const stripe = KEY ? new Stripe(KEY) : null;

export function stripeEnabled(): boolean {
  return Boolean(stripe);
}

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
