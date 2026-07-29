"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { notifyStudio } from "@/lib/notify";
import { capacityLimited, dayLabel, timeLabel } from "@/lib/format";
import { studioNow } from "@/lib/time";

function siteOrigin(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

const emailish = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

type GiftRecipient = { firstName: string; lastName: string; email: string };

// How many people currently hold a confirmed spot in a class (members + guests).
async function bookedCount(sessionId: string): Promise<number> {
  const [members, guests] = await Promise.all([
    prisma.booking.count({
      where: { sessionId, status: { in: ["BOOKED", "ATTENDED", "NO_SHOW"] } },
    }),
    prisma.guestBooking.count({
      where: { sessionId, status: { in: ["BOOKED", "ATTENDED", "NO_SHOW"] } },
    }),
  ]);
  return members + guests;
}

// A member pays the single-class (drop-in) rate to gift a spot in a specific
// class to a named person. Returns a Stripe checkout URL.
export async function giftClassCheckout(
  sessionId: string,
  recipient: GiftRecipient
) {
  const user = await getCurrentUser();
  if (!user)
    return { ok: false as const, error: "Please sign in.", needAuth: true };

  const firstName = recipient.firstName.trim();
  const lastName = recipient.lastName.trim();
  const email = recipient.email.trim();
  if (!firstName || !lastName)
    return { ok: false as const, error: "Enter the recipient's first and last name." };
  if (!emailish(email))
    return { ok: false as const, error: "Enter a valid email for the recipient." };

  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: { classType: true },
  });
  if (!session || session.cancelled)
    return { ok: false as const, error: "That class isn't available." };
  if (session.registrationClosed)
    return { ok: false as const, error: "Registration for this class is closed." };
  if (session.startsAt.getTime() < studioNow().getTime())
    return { ok: false as const, error: "That class has already started." };

  if (capacityLimited(session.classType.name)) {
    const taken = await bookedCount(sessionId);
    if (taken >= session.capacity)
      return { ok: false as const, error: "That class is full." };
  }

  if (!stripeEnabled() || !stripe)
    return { ok: false as const, error: "Payments aren't set up." };

  // Price the gift at the studio's single-class (drop-in) rate.
  const plan = await prisma.membershipPlan.findFirst({
    where: { active: true, kind: "DROP_IN" },
    orderBy: { priceCents: "asc" },
  });
  if (!plan)
    return {
      ok: false as const,
      error: "Single-class gifting isn't set up yet — ask the studio.",
    };

  const origin = siteOrigin();
  const cs = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: plan.priceCents,
          product_data: {
            name: `Gift: ${session.classType.name}`,
            description: `${dayLabel(session.startsAt)} · ${timeLabel(
              session.startsAt
            )} — for ${firstName} ${lastName}`,
          },
        },
      },
    ],
    metadata: {
      kind: "class_gift",
      sessionId,
      firstName,
      lastName,
      email,
      buyerUserId: user.id,
    },
    payment_intent_data: { metadata: { kind: "class_gift", sessionId } },
    success_url: `${origin}/gift?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/gift?status=cancel`,
  });

  return { ok: true as const, url: cs.url };
}

// Create the gifted spot (a paid GuestBooking). Idempotent via stripeRef.
export async function fulfillClassGift(
  meta: Record<string, string | undefined> | null,
  amountCents: number,
  stripeRef: string
): Promise<boolean> {
  if (!meta || meta.kind !== "class_gift") return false;
  const { sessionId, firstName, lastName, email, buyerUserId } = meta;
  if (!sessionId || !firstName || !lastName || !buyerUserId) return false;

  const existing = await prisma.guestBooking.findUnique({ where: { stripeRef } });
  if (existing) return true;

  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: { classType: true },
  });
  if (!session) return false;

  await prisma.guestBooking.create({
    data: {
      sessionId,
      hostUserId: buyerUserId,
      membershipId: null,
      firstName,
      lastName,
      phone: null,
      email: email ?? null,
      source: "GIFT",
      amountCents,
      stripeRef,
      status: "BOOKED",
    },
  });

  await notifyStudio(
    `Gifted class spot: ${session.classType.name}`,
    `${firstName} ${lastName}${email ? ` (${email})` : ""} was gifted a spot in ${
      session.classType.name
    } on ${dayLabel(session.startsAt)} at ${timeLabel(session.startsAt)}.`
  );
  revalidatePath(`/admin/schedule/${sessionId}`);
  revalidatePath("/admin/schedule");
  return true;
}

// Fulfill a gift on return from Stripe (belt-and-suspenders vs the webhook).
export async function finalizeClassGift(stripeSessionId: string): Promise<boolean> {
  if (!stripe) return false;
  try {
    const cs = await stripe.checkout.sessions.retrieve(stripeSessionId);
    const paid = cs.payment_status === "paid" || cs.status === "complete";
    if (!paid || cs.metadata?.kind !== "class_gift") return false;
    return await fulfillClassGift(
      cs.metadata as Record<string, string>,
      cs.amount_total ?? 0,
      cs.id
    );
  } catch {
    return false;
  }
}
