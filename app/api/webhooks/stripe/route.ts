import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { grantMembership } from "@/lib/membership";
import { fulfillEventOrder } from "@/app/actions/events";
import { notifyStudio } from "@/lib/notify";
import { money } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Give the handler headroom so a cold start + DB never times out (which Stripe
// reports as an "other" webhook error).
export const maxDuration = 30;

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

        // Multi-ticket / gift event purchase.
        if (session.metadata?.kind === "event_order") {
          const orderId = session.metadata?.orderId;
          if (orderId) await fulfillEventOrder(orderId);
          break;
        }

        // Event registration payment (single legacy ticket).
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
                const name =
                  session.customer_details?.name ??
                  (u ? `${u.firstName} ${u.lastName}` : "Guest");
                const email = session.customer_details?.email ?? u?.email ?? "";
                const amountCents = session.amount_total ?? evt.priceCents;
                await prisma.eventRegistration.create({
                  data: {
                    eventId,
                    userId: uId,
                    name,
                    email,
                    status: "PAID",
                    source: "Paid online",
                    amountCents,
                    stripeRef: session.id,
                  },
                });
                // Let the studio know someone registered (paid).
                await notifyStudio(
                  `Event registration: ${evt.name}`,
                  `${name} (${email}) registered for ${evt.name} — paid ${money(amountCents)}.`
                );
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

        // The subscription id lives in different places across Stripe API
        // versions — check them all so renewals never silently skip.
        const inv = invoice as any;
        const subId: string | null =
          (typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id) ??
          inv.parent?.subscription_details?.subscription ??
          inv.subscription_details?.subscription ??
          inv.lines?.data?.[0]?.subscription ??
          inv.lines?.data?.[0]?.parent?.subscription_item_details?.subscription ??
          null;

        if (subId) {
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
            // The next billing date is on the invoice itself (the billed
            // period's end) — no need for a slow extra API call.
            const periodEnd = inv.lines?.data?.[0]?.period?.end;
            const expiresAt = periodEnd
              ? new Date(periodEnd * 1000)
              : await subscriptionPeriodEnd(subId);
            // Monthly membership guest passes reset each renewal (they don't
            // roll over). Pack-based passes (e.g. Dwell Together) are
            // credit-like — they stay until used — so they're never reset.
            const resetGuestPasses = membership.plan.kind === "UNLIMITED";
            await prisma.membership.update({
              where: { id: membership.id },
              data: {
                status: "ACTIVE",
                expiresAt,
                autoRenew: true,
                ...(resetGuestPasses
                  ? { guestPassesUsed: 0, guestPassesBonus: 0 }
                  : {}),
              },
            });
          }
        }
        break;
      }

      // Any subscription change — cancel-at-period-end, reactivation, plan
      // change, etc. Keep the CRM's renew status and date in step with Stripe.
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const membership = await prisma.membership.findUnique({
          where: { stripeSubscriptionId: sub.id },
        });
        if (membership) {
          const active = sub.status === "active" || sub.status === "trialing";
          const end =
            (sub as any).current_period_end ??
            (sub as any).items?.data?.[0]?.current_period_end;
          await prisma.membership.update({
            where: { id: membership.id },
            data: {
              autoRenew: active && !sub.cancel_at_period_end,
              ...(active ? { status: "ACTIVE" } : {}),
              ...(active && end ? { expiresAt: new Date(end * 1000) } : {}),
            },
          });
        }
        break;
      }

      // Subscription fully cancelled — stop auto-renew (membership runs out its term).
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
