import { prisma } from "./db";
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

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + plan.durationDays);

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
