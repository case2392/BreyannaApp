import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { grantMembership } from "@/lib/membership";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    // Payments not configured — nothing to do.
    return NextResponse.json({ received: true, ignored: true });
  }

  const sig = request.headers.get("stripe-signature");
  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig!, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err?.message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      // New purchase (one-time pack/drop-in, or first subscription payment).
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;
        if (userId && planId) {
          const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
          if (plan) {
            const subId =
              typeof session.subscription === "string" ? session.subscription : undefined;
            await grantMembership(userId, plan, {
              stripeSubscriptionId: subId,
              pricePaidCents: session.amount_total ?? plan.priceCents,
            });
          }
        }
        break;
      }

      // Recurring renewal — extend the membership another period.
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.billing_reason === "subscription_cycle" && invoice.subscription) {
          const subId =
            typeof invoice.subscription === "string"
              ? invoice.subscription
              : invoice.subscription.id;
          const membership = await prisma.membership.findUnique({
            where: { stripeSubscriptionId: subId },
            include: { plan: true },
          });
          if (membership) {
            const base =
              membership.expiresAt > new Date() ? membership.expiresAt : new Date();
            const expiresAt = new Date(base);
            expiresAt.setDate(expiresAt.getDate() + membership.plan.durationDays);
            await prisma.membership.update({
              where: { id: membership.id },
              data: { status: "ACTIVE", expiresAt, autoRenew: true },
            });
          }
        }
        break;
      }

      // Subscription cancelled — stop auto-renew (membership runs out its term).
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await prisma.membership.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: { autoRenew: false },
        });
        break;
      }
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
