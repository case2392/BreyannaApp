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
  await prisma.eventRegistration.delete({ where: { id: registrationId } });
  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${reg.eventId}`);
  return { ok: true };
}
