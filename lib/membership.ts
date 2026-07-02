import { prisma } from "./db";
import { stripe } from "./stripe";
import type { MembershipPlan } from "@prisma/client";

// Grant (or extend) a membership for a user. Shared by the instant-grant
// fallback and the Stripe webhook so the rules live in one place.
export async function grantMembership(
  userId: string,
  plan: MembershipPlan,
  opts: { stripeSubscriptionId?: string; pricePaidCents?: number } = {}
) {
  const isSubscription = plan.kind === "UNLIMITED" && Boolean(opts.stripeSubscriptionId);

  // If this subscription already has a membership, extend it (renewal).
  if (opts.stripeSubscriptionId) {
    const existing = await prisma.membership.findUnique({
      where: { stripeSubscriptionId: opts.stripeSubscriptionId },
    });
    if (existing) {
      const base = existing.expiresAt > new Date() ? existing.expiresAt : new Date();
      const expiresAt = new Date(base);
      expiresAt.setDate(expiresAt.getDate() + plan.durationDays);
      return prisma.membership.update({
        where: { id: existing.id },
        data: { status: "ACTIVE", expiresAt, autoRenew: true },
      });
    }
  }

  // Unlimited = a monthly period that renews. Packs & drop-ins are credits
  // that never expire (we just track credits until they're used), so we set a
  // far-future date to keep them permanently "active".
  const expiresAt = new Date();
  if (plan.kind === "UNLIMITED") {
    expiresAt.setDate(expiresAt.getDate() + plan.durationDays);
  } else {
    expiresAt.setFullYear(expiresAt.getFullYear() + 50);
  }

  return prisma.membership.create({
    data: {
      userId,
      planId: plan.id,
      status: "ACTIVE",
      creditsRemaining: plan.kind === "UNLIMITED" ? 0 : plan.credits,
      expiresAt,
      pricePaidCents: opts.pricePaidCents ?? plan.priceCents,
      autoRenew: isSubscription,
      stripeSubscriptionId: opts.stripeSubscriptionId ?? null,
    },
  });
}

// Does a membership kind expire? Only unlimited (monthly) does; packs/drop-ins
// are credit-based and never expire.
export function planExpires(kind: string): boolean {
  return kind === "UNLIMITED";
}

// Belt-and-suspenders activation: when a member returns from Stripe checkout,
// verify the session directly with Stripe (using the same key that created it)
// and grant the membership. This makes activation work even if the webhook
// never fires (e.g. environment mismatch). Idempotent: subscriptions dedupe by
// subscription id; one-time purchases only grant if none is already active.
export async function finalizeCheckoutSession(
  userId: string,
  sessionId: string
): Promise<boolean> {
  if (!stripe) return false;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid =
      session.payment_status === "paid" || session.status === "complete";
    if (!paid) return false;
    if (session.metadata?.userId !== userId) return false;

    const planId = session.metadata?.planId;
    if (!planId) return false;
    const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
    if (!plan) return false;

    const subId =
      typeof session.subscription === "string" ? session.subscription : null;
    const pricePaidCents = session.amount_total ?? plan.priceCents;

    if (subId) {
      await grantMembership(userId, plan, { stripeSubscriptionId: subId, pricePaidCents });
    } else {
      const active = await prisma.membership.findFirst({
        where: { userId, planId: plan.id, status: "ACTIVE", expiresAt: { gt: new Date() } },
      });
      if (!active) await grantMembership(userId, plan, { pricePaidCents });
    }
    return true;
  } catch {
    return false;
  }
}
