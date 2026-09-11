"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { notifyStudio } from "@/lib/notify";
import { money } from "@/lib/format";
import { EVENT_SOURCES } from "@/lib/eventSources";

function siteOrigin(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

async function confirmRegistration(opts: {
  eventId: string;
  userId: string | null;
  name: string;
  email: string;
  status: "REGISTERED" | "PAID";
  amountCents: number;
  source: string;
  stripeRef?: string;
  eventName: string;
}) {
  await prisma.eventRegistration.create({
    data: {
      eventId: opts.eventId,
      userId: opts.userId,
      name: opts.name,
      email: opts.email,
      status: opts.status,
      source: opts.source,
      amountCents: opts.amountCents,
      stripeRef: opts.stripeRef ?? null,
    },
  });
  await notifyStudio(
    `Event registration: ${opts.eventName}`,
    `${opts.name} (${opts.email}) registered for ${opts.eventName}` +
      (opts.amountCents > 0 ? ` — paid ${money(opts.amountCents)}.` : ".")
  );
}

export async function registerForEvent(eventId: string) {
  const user = await getCurrentUser();
  if (!user)
    return { ok: false, error: "Please sign in to register.", needAuth: true };

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || !event.active)
    return { ok: false, error: "This event isn't available." };
  if (event.registrationClosed)
    return { ok: false, error: "Registration for this event is closed." };
  if (event.capacity != null) {
    const count = await prisma.eventRegistration.count({ where: { eventId } });
    if (count >= event.capacity)
      return { ok: false, error: "This event is sold out." };
  }

  const existing = await prisma.eventRegistration.findFirst({
    where: { eventId, userId: user.id },
  });
  if (existing) return { ok: true, already: true };

  // Free event, or payments not configured → confirm immediately.
  if (event.priceCents === 0 || !stripeEnabled()) {
    await confirmRegistration({
      eventId,
      userId: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      status: "REGISTERED",
      amountCents: event.priceCents === 0 ? 0 : event.priceCents,
      source: "Website",
      eventName: event.name,
    });
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/admin/events");
    return { ok: true, registered: true };
  }

  // Paid event → Stripe checkout.
  const origin = siteOrigin();
  const session = await stripe!.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: event.priceCents,
          product_data: {
            name: event.name,
            description: event.description ?? undefined,
          },
        },
      },
    ],
    metadata: { kind: "event", eventId, userId: user.id },
    payment_intent_data: {
      metadata: { kind: "event", eventId, userId: user.id },
    },
    success_url: `${origin}/events/${eventId}?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/events/${eventId}?status=cancel`,
  });

  return { ok: true, url: session.url };
}

// Confirm a paid registration on return from Stripe (works even if the webhook
// hasn't fired). Idempotent via the checkout session id.
export async function finalizeEventCheckout(sessionId: string): Promise<boolean> {
  if (!stripe) return false;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid =
      session.payment_status === "paid" || session.status === "complete";
    if (!paid || session.metadata?.kind !== "event") return false;

    const eventId = session.metadata?.eventId;
    if (!eventId) return false;

    const already = await prisma.eventRegistration.findUnique({
      where: { stripeRef: session.id },
    });
    if (already) return true;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return false;

    const userId = session.metadata?.userId ?? null;
    const user = userId
      ? await prisma.user.findUnique({ where: { id: userId } })
      : null;

    await confirmRegistration({
      eventId,
      userId,
      name:
        session.customer_details?.name ??
        (user ? `${user.firstName} ${user.lastName}` : "Guest"),
      email: session.customer_details?.email ?? user?.email ?? "",
      status: "PAID",
      amountCents: session.amount_total ?? event.priceCents,
      source: "Paid online",
      stripeRef: session.id,
      eventName: event.name,
    });
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/admin/events");
    return true;
  } catch {
    return false;
  }
}

// ---- Multi-ticket / gift purchases ---------------------------------------

type TicketAttendee = {
  firstName: string;
  lastName: string;
  email: string;
  isBuyer: boolean;
};

const emailish = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

function cleanAttendees(raw: unknown): TicketAttendee[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 20)
    .map((a: any) => ({
      firstName: String(a?.firstName ?? "").trim(),
      lastName: String(a?.lastName ?? "").trim(),
      email: String(a?.email ?? "").trim(),
      isBuyer: Boolean(a?.isBuyer),
    }))
    .filter((a) => a.firstName && a.lastName && emailish(a.email));
}

// Write the actual registration rows for a set of attendees (one row each).
async function createEventRegistrations(
  event: { id: string; name: string; priceCents: number },
  attendees: TicketAttendee[],
  opts: {
    paid: boolean;
    perTicketCents: number;
    buyerUserId: string | null;
    purchaseRef: string | null;
  }
) {
  for (const a of attendees) {
    await prisma.eventRegistration.create({
      data: {
        eventId: event.id,
        userId: a.isBuyer ? opts.buyerUserId : null,
        name: `${a.firstName} ${a.lastName}`,
        email: a.email,
        status: opts.paid ? "PAID" : "REGISTERED",
        source: a.isBuyer ? (opts.paid ? "Paid online" : "Website") : "Gift",
        amountCents: opts.paid ? opts.perTicketCents : 0,
        isGift: !a.isBuyer,
        purchasedByUserId: opts.buyerUserId,
        purchaseRef: opts.purchaseRef,
      },
    });
  }
  const gifts = attendees.filter((a) => !a.isBuyer).length;
  await notifyStudio(
    `Event registration: ${event.name}`,
    `${attendees.length} ticket${attendees.length === 1 ? "" : "s"} for ${event.name}` +
      (gifts > 0 ? ` (${gifts} gifted)` : "") +
      (opts.paid ? ` — paid ${money(opts.perTicketCents * attendees.length)}.` : ".")
  );
}

// Buy one or more tickets to an event. The buyer's own ticket (isBuyer) links to
// their account; the rest are gift tickets assigned to a named person.
export async function buyEventTickets(eventId: string, rawAttendees: unknown) {
  const user = await getCurrentUser();
  if (!user)
    return { ok: false as const, error: "Please sign in.", needAuth: true };

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || !event.active)
    return { ok: false as const, error: "This event isn't available." };
  if (event.registrationClosed)
    return { ok: false as const, error: "Registration for this event is closed." };

  let attendees = cleanAttendees(rawAttendees);
  // Don't double-register the buyer if they already have a spot.
  const alreadyMe = await prisma.eventRegistration.findFirst({
    where: { eventId, userId: user.id },
  });
  if (alreadyMe) attendees = attendees.filter((a) => !a.isBuyer);
  if (attendees.length === 0)
    return { ok: false as const, error: "Add at least one ticket with a name and email." };

  if (event.capacity != null) {
    const count = await prisma.eventRegistration.count({ where: { eventId } });
    if (count + attendees.length > event.capacity)
      return {
        ok: false as const,
        error:
          event.capacity - count <= 0
            ? "This event is sold out."
            : `Only ${event.capacity - count} spot${
                event.capacity - count === 1 ? "" : "s"
              } left.`,
      };
  }

  // Free event (or payments off) → register everyone right away.
  if (event.priceCents === 0 || !stripeEnabled()) {
    await createEventRegistrations(event, attendees, {
      paid: false,
      perTicketCents: 0,
      buyerUserId: user.id,
      purchaseRef: null,
    });
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/admin/events");
    return { ok: true as const, registered: true };
  }

  // Paid → stash the attendees in a pending order, then send to Stripe.
  const order = await prisma.eventOrder.create({
    data: {
      eventId,
      buyerUserId: user.id,
      attendees: attendees as any,
      quantity: attendees.length,
      amountCents: event.priceCents * attendees.length,
    },
  });

  const origin = siteOrigin();
  const session = await stripe!.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    line_items: [
      {
        quantity: attendees.length,
        price_data: {
          currency: "usd",
          unit_amount: event.priceCents,
          product_data: {
            name: event.name,
            description: event.description ?? undefined,
          },
        },
      },
    ],
    metadata: { kind: "event_order", orderId: order.id },
    payment_intent_data: {
      metadata: { kind: "event_order", orderId: order.id },
    },
    success_url: `${origin}/events/${eventId}?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/events/${eventId}?status=cancel`,
  });

  await prisma.eventOrder.update({
    where: { id: order.id },
    data: { stripeSessionId: session.id },
  });

  return { ok: true as const, url: session.url };
}

// Turn a paid EventOrder into registration rows. Idempotent: the first caller
// (webhook or success-return) atomically claims the order; later calls no-op.
export async function fulfillEventOrder(orderId: string): Promise<boolean> {
  const claimed = await prisma.eventOrder.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { status: "FULFILLED" },
  });
  if (claimed.count === 0) return true; // already done (or unknown id)

  const order = await prisma.eventOrder.findUnique({ where: { id: orderId } });
  if (!order) return false;
  const event = await prisma.event.findUnique({ where: { id: order.eventId } });
  if (!event) return false;

  const attendees = cleanAttendees(order.attendees);
  const perTicket =
    order.quantity > 0 ? Math.round(order.amountCents / order.quantity) : 0;
  await createEventRegistrations(event, attendees, {
    paid: true,
    perTicketCents: perTicket,
    buyerUserId: order.buyerUserId,
    purchaseRef: order.id,
  });
  revalidatePath(`/events/${order.eventId}`);
  revalidatePath("/admin/events");
  return true;
}

// Fulfill a multi-ticket order on return from Stripe (works even if the webhook
// never fires). Idempotent via fulfillEventOrder's atomic claim.
export async function finalizeEventOrder(sessionId: string): Promise<boolean> {
  if (!stripe) return false;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid =
      session.payment_status === "paid" || session.status === "complete";
    if (!paid || session.metadata?.kind !== "event_order") return false;
    const orderId = session.metadata?.orderId;
    if (!orderId) return false;
    return await fulfillEventOrder(orderId);
  } catch {
    return false;
  }
}

// CRM: manually register a member (pass a userId) or a guest (pass name/email)
// for an event. No charge — for comps, cash, or walk-ins.
export async function staffAddEventRegistration(
  eventId: string,
  userId: string | null,
  guestName: string,
  guestEmail: string,
  source: string
) {
  const staff = await getCurrentUser();
  if (!staff || !isStaff(staff.role))
    return { ok: false, error: "Not authorized." };

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { ok: false, error: "Event not found." };

  const tag = EVENT_SOURCES.includes(source as any) ? source : "Other";

  let name = guestName.trim();
  let email = guestEmail.trim();

  if (userId) {
    const member = await prisma.user.findUnique({ where: { id: userId } });
    if (!member) return { ok: false, error: "Member not found." };
    const existing = await prisma.eventRegistration.findFirst({
      where: { eventId, userId },
    });
    if (existing) return { ok: false, error: "Already registered." };
    name = `${member.firstName} ${member.lastName}`;
    email = member.email;
  } else if (!name) {
    return { ok: false, error: "Enter a name for the guest." };
  }

  await prisma.eventRegistration.create({
    data: {
      eventId,
      userId,
      name,
      email,
      status: "REGISTERED",
      source: tag,
      amountCents: 0,
    },
  });
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath("/admin/events");
  return { ok: true };
}

// CRM: manually open/close registration for an event.
export async function setEventRegistrationClosed(
  eventId: string,
  closed: boolean
) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.role))
    return { ok: false, error: "Not authorized." };
  await prisma.event.update({
    where: { id: eventId },
    data: { registrationClosed: closed },
  });
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

// CRM: remove a registration (staff only).
export async function removeRegistration(registrationId: string) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.role))
    return { ok: false, error: "Not authorized." };
  const reg = await prisma.eventRegistration.findUnique({
    where: { id: registrationId },
  });
  if (!reg) return { ok: false, error: "Registration not found." };
  // Refund any membership credits that were spent on this registration.
  await prisma.$transaction(async (tx) => {
    if (reg.membershipId && reg.creditsSpent > 0) {
      await tx.membership.update({
        where: { id: reg.membershipId },
        data: { creditsRemaining: { increment: reg.creditsSpent } },
      });
    }
    await tx.eventRegistration.delete({ where: { id: registrationId } });
  });
  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${reg.eventId}`);
  revalidatePath(`/events/${reg.eventId}`);
  return { ok: true };
}

// Register for an event using the member's membership/credits (like a class):
// unlimited plans register free; packs/drop-ins spend the event's creditCost.
export async function bookEventWithCredits(eventId: string) {
  const user = await getCurrentUser();
  if (!user)
    return { ok: false as const, error: "Please sign in.", needAuth: true };

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || !event.active)
    return { ok: false as const, error: "This event isn't available." };
  if (!event.allowCredits)
    return {
      ok: false as const,
      error: "This event can't be booked with a membership.",
    };
  if (event.registrationClosed)
    return { ok: false as const, error: "Registration for this event is closed." };

  const existing = await prisma.eventRegistration.findFirst({
    where: { eventId, userId: user.id },
  });
  if (existing) return { ok: true as const, already: true };

  if (event.capacity != null) {
    const count = await prisma.eventRegistration.count({ where: { eventId } });
    if (count >= event.capacity)
      return { ok: false as const, error: "This event is sold out." };
  }

  const now = new Date();
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id, status: "ACTIVE", expiresAt: { gt: now } },
    include: { plan: true },
    orderBy: { expiresAt: "asc" },
  });
  const unlimited = memberships.find((m) => m.plan.kind === "UNLIMITED");
  const pack = memberships.find(
    (m) => m.plan.kind !== "UNLIMITED" && m.creditsRemaining >= event.creditCost
  );
  const chosen = unlimited ?? pack;
  if (!chosen) {
    return {
      ok: false as const,
      error:
        memberships.length > 0
          ? `You don't have enough credits — this event costs ${event.creditCost} credit${
              event.creditCost === 1 ? "" : "s"
            }.`
          : "You need an active membership or class pack to book this with credits.",
    };
  }
  const charge = chosen.plan.kind !== "UNLIMITED";

  await prisma.$transaction(async (tx) => {
    await tx.eventRegistration.create({
      data: {
        eventId,
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        status: "REGISTERED",
        source: "Membership",
        amountCents: 0,
        membershipId: charge ? chosen.id : null,
        creditsSpent: charge ? event.creditCost : 0,
      },
    });
    if (charge) {
      await tx.membership.update({
        where: { id: chosen.id },
        data: { creditsRemaining: { decrement: event.creditCost } },
      });
    }
  });

  await notifyStudio(
    `Event registration: ${event.name}`,
    `${user.firstName} ${user.lastName} registered for ${event.name} using their membership.`
  );
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/admin/events");
  return { ok: true as const, registered: true };
}

// A member cancels their own free/credit event registration (refunds credits).
// Paid tickets are handled by the studio.
export async function cancelMyEventRegistration(registrationId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Please sign in." };
  const reg = await prisma.eventRegistration.findUnique({
    where: { id: registrationId },
  });
  if (!reg || reg.userId !== user.id)
    return { ok: false as const, error: "Registration not found." };
  if (reg.status === "PAID")
    return {
      ok: false as const,
      error: "Paid tickets can't be cancelled here — please contact the studio.",
    };
  await prisma.$transaction(async (tx) => {
    if (reg.membershipId && reg.creditsSpent > 0) {
      await tx.membership.update({
        where: { id: reg.membershipId },
        data: { creditsRemaining: { increment: reg.creditsSpent } },
      });
    }
    await tx.eventRegistration.delete({ where: { id: reg.id } });
  });
  revalidatePath(`/events/${reg.eventId}`);
  revalidatePath("/admin/events");
  return { ok: true as const };
}
