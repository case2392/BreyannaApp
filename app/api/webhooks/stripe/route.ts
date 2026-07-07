import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { grantMembership } from "@/lib/membership";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The next billing date for a subscription (falls back to one month out).
async function subscriptionPeriodEnd(subId: string): Promise<Date> {
  const fallback = new Date();
  fallback.setMonth(fallback.getMonth() + 1);
  try {
    const sub = await stripe!.subscriptions.retrieve(subId);
    const end =
      (sub as any).current_period_end ??
      (sub as any).items?.data?.[0]?.current_period_end;
    if (end) return new Date(end * 1000);
  } catch {
    /* fall through to +1 month */
  }
  return fallback;
}

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

        // Sponsor a Sister donation — record it, don't grant a membership.
        if (session.metadata?.kind === "donation") {
          await prisma.donation.upsert({
            where: { stripeRef: session.id },
            create: {
              stripeRef: session.id,
              name: session.customer_details?.name ?? null,
              email: session.customer_details?.email ?? null,
              amountCents: session.amount_total ?? 0,
              recurring: session.mode === "subscription",
            },
            update: {},
          });
          break;
        }

        // Event registration payment.
        if (session.metadata?.kind === "event") {
          const eventId = session.metadata?.eventId;
          if (eventId) {
            const existing = await prisma.eventRegistration.findUnique({
              where: { stripeRef: session.id },
            });
            if (!existing) {
              const evt = await prisma.event.findUnique({
                where: { id: eventId },
              });
              const uId = session.metadata?.userId ?? null;
              const u = uId
                ? await prisma.user.findUnique({ where: { id: uId } })
                : null;
              if (evt) {
                await prisma.eventRegistration.create({
                  data: {
                    eventId,
                    userId: uId,
                    name:
                      session.customer_details?.name ??
                      (u ? `${u.firstName} ${u.lastName}` : "Guest"),
                    email:
                      session.customer_details?.email ?? u?.email ?? "",
                    status: "PAID",
                    amountCents: session.amount_total ?? evt.priceCents,
                    stripeRef: session.id,
                  },
                });
              }
            }
          }
          break;
        }

        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;
        if (userId && planId) {
          const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
          if (plan) {
            const subId =
              typeof session.subscription === "string" ? session.subscription : undefined;
            let periodEnd: Date | undefined;
            if (subId) {
              try {
                const sub = await stripe.subscriptions.retrieve(subId);
                if (sub.current_period_end)
                  periodEnd = new Date(sub.current_period_end * 1000);
              } catch {}
            }
            await grantMembership(userId, plan, {
              stripeSubscriptionId: subId,
              pricePaidCents: session.amount_total ?? plan.priceCents,
              periodEnd,
            });
          }
        }
        break;
      }

      // Recurring renewal — extend the membership (or record a recurring donation).
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.billing_reason !== "subscription_cycle") break;

        // Recurring "Sponsor a Sister" donation renewal.
        if ((invoice as any).subscription_details?.metadata?.kind === "donation") {
          await prisma.donation.upsert({
            where: { stripeRef: invoice.id },
            create: {
              stripeRef: invoice.id,
              email: invoice.customer_email ?? null,
              amountCents: invoice.amount_paid ?? 0,
              recurring: true,
            },
            update: {},
          });
          break;
        }

        if (invoice.subscription) {
          const subId =
            typeof invoice.subscription === "string"
              ? invoice.subscription
              : invoice.subscription.id;

          // 1) Direct match: a membership already linked to this subscription.
          let membership = await prisma.membership.findUnique({
            where: { stripeSubscriptionId: subId },
            include: { plan: true },
          });

          // 2) Adopt: no linked membership yet (e.g. the member subscribed in
          // Stripe before the site went live). Find them by Stripe customer id
          // or email, then link this subscription to their active membership so
          // future renewals map directly.
          if (!membership) {
            const customerId =
              typeof invoice.customer === "string"
                ? invoice.customer
                : invoice.customer?.id;
            let user = customerId
              ? await prisma.user.findFirst({
                  where: { stripeCustomerId: customerId },
                })
              : null;
            if (!user && invoice.customer_email) {
              user = await prisma.user.findUnique({
                where: { email: invoice.customer_email.toLowerCase() },
              });
            }
            if (user) {
              const candidate = await prisma.membership.findFirst({
                where: {
                  userId: user.id,
                  status: "ACTIVE",
                  stripeSubscriptionId: null,
                  plan: { kind: "UNLIMITED" },
                },
                include: { plan: true },
                orderBy: { createdAt: "desc" },
              });
              if (candidate) {
                await prisma.membership.update({
                  where: { id: candidate.id },
                  data: { stripeSubscriptionId: subId },
                });
                membership = candidate;
              }
              // Backfill the customer id so future events match directly.
              if (customerId && !user.stripeCustomerId) {
                await prisma.user.update({
                  where: { id: user.id },
                  data: { stripeCustomerId: customerId },
                });
              }
            }
          }

          if (membership) {
            await prisma.membership.update({
              where: { id: membership.id },
              data: {
                status: "ACTIVE",
                expiresAt: await subscriptionPeriodEnd(subId),
                autoRenew: true,
              },
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
