"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { grantMembership } from "@/lib/membership";

function siteOrigin(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

async function ensureCustomer(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  stripeCustomerId: string | null;
}): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await stripe!.customers.create({
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    metadata: { userId: user.id },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

export async function startCheckout(planId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
  if (!plan || !plan.active) return { ok: false, error: "Plan not available." };

  // No Stripe configured → keep the demo behaviour (grant instantly).
  if (!stripeEnabled()) {
    await grantMembership(user.id, plan);
    revalidatePath("/memberships");
    revalidatePath("/schedule");
    return { ok: true, granted: true };
  }

  const customerId = await ensureCustomer(user);
  const origin = siteOrigin();
  const isSubscription = plan.kind === "UNLIMITED";

  const session = await stripe!.checkout.sessions.create({
    mode: isSubscription ? "subscription" : "payment",
    customer: customerId,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: plan.priceCents,
          product_data: { name: plan.name, description: plan.description ?? undefined },
          ...(isSubscription ? { recurring: { interval: "month" as const } } : {}),
        },
      },
    ],
    metadata: { userId: user.id, planId: plan.id },
    ...(isSubscription
      ? { subscription_data: { metadata: { userId: user.id, planId: plan.id } } }
      : { payment_intent_data: { metadata: { userId: user.id, planId: plan.id } } }),
    success_url: `${origin}/memberships?status=success`,
    cancel_url: `${origin}/memberships?status=cancel`,
    allow_promotion_codes: true,
  });

  return { ok: true, url: session.url };
}

export async function openBillingPortal() {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in." };
  if (!stripeEnabled() || !user.stripeCustomerId)
    return { ok: false, error: "Billing management isn't available yet." };

  const portal = await stripe!.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${siteOrigin()}/memberships`,
  });
  return { ok: true, url: portal.url };
}
