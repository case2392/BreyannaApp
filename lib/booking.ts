import { prisma } from "./db";
import type { Membership, MembershipPlan } from "@prisma/client";

type MembershipWithPlan = Membership & { plan: MembershipPlan };

export type BookResult =
  | { ok: true; status: "BOOKED" | "WAITLISTED" }
  | { ok: false; error: string };

// Count how many people currently hold a confirmed spot in a session.
async function countBooked(sessionId: string): Promise<number> {
  return prisma.booking.count({
    where: { sessionId, status: { in: ["BOOKED", "ATTENDED", "NO_SHOW"] } },
  });
}

// Find the member's usable membership for a given credit cost.
// Prefers UNLIMITED, then the pack expiring soonest with enough credits.
async function findUsableMembership(
  userId: string,
  creditCost: number
): Promise<MembershipWithPlan | null> {
  const now = new Date();
  const memberships = await prisma.membership.findMany({
    where: { userId, status: "ACTIVE", expiresAt: { gt: now } },
    include: { plan: true },
    orderBy: { expiresAt: "asc" },
  });

  const unlimited = memberships.find((m) => m.plan.kind === "UNLIMITED");
  if (unlimited) return unlimited;

  return (
    memberships.find(
      (m) => m.plan.kind !== "UNLIMITED" && m.creditsRemaining >= creditCost
    ) ?? null
  );
}

// Book a member into a class (or waitlist them if it is full).
export async function bookClass(
  userId: string,
  sessionId: string
): Promise<BookResult> {
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: { classType: true },
  });
  if (!session) return { ok: false, error: "Class not found." };
  if (session.cancelled) return { ok: false, error: "This class was cancelled." };
  if (session.startsAt < new Date())
    return { ok: false, error: "This class has already started." };

  // Already have a booking? (unique constraint also guards this)
  const existing = await prisma.booking.findUnique({
    where: { userId_sessionId: { userId, sessionId } },
  });
  if (existing && existing.status !== "CANCELLED") {
    return { ok: false, error: "You are already on the list for this class." };
  }

  const creditCost = session.classType.creditCost;
  const membership = await findUsableMembership(userId, creditCost);
  if (!membership) {
    return {
      ok: false,
      error: "You need an active membership or class pack to book.",
    };
  }

  const taken = await countBooked(sessionId);
  const isFull = taken >= session.capacity;
  const status = isFull ? "WAITLISTED" : "BOOKED";

  // Only charge a credit for a confirmed spot (not while waitlisted).
  const chargeCredit = status === "BOOKED" && membership.plan.kind !== "UNLIMITED";

  await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.booking.update({
        where: { id: existing.id },
        data: {
          status,
          membershipId: chargeCredit ? membership.id : null,
          createdAt: new Date(),
        },
      });
    } else {
      await tx.booking.create({
        data: {
          userId,
          sessionId,
          status,
          membershipId: chargeCredit ? membership.id : null,
        },
      });
    }
    if (chargeCredit) {
      await tx.membership.update({
        where: { id: membership.id },
        data: { creditsRemaining: { decrement: creditCost } },
      });
    }
  });

  return { ok: true, status };
}

// Cancel a booking: refund the credit and promote the first person waiting.
export async function cancelBooking(
  userId: string,
  bookingId: string
): Promise<
  | { ok: false; error: string }
  | { ok: true; promotedUserId: string | null; sessionId: string }
> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { session: { include: { classType: true } } },
  });
  if (!booking || booking.userId !== userId)
    return { ok: false, error: "Booking not found." };
  if (booking.status === "CANCELLED")
    return { ok: false, error: "Already cancelled." };

  // Captures who (if anyone) was promoted off the waitlist, so the caller can
  // notify them. Set inside the transaction.
  let promotedUserId: string | null = null;

  await prisma.$transaction(async (tx) => {
    // Refund the credit that was spent, if any.
    if (booking.membershipId) {
      await tx.membership.update({
        where: { id: booking.membershipId },
        data: {
          creditsRemaining: {
            increment: booking.session.classType.creditCost,
          },
        },
      });
    }
    await tx.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED", membershipId: null },
    });

    // If a confirmed spot opened up, promote the longest-waiting person.
    const wasConfirmed = booking.status === "BOOKED";
    if (wasConfirmed) {
      const next = await tx.booking.findFirst({
        where: { sessionId: booking.sessionId, status: "WAITLISTED" },
        orderBy: { createdAt: "asc" },
        include: { session: { include: { classType: true } } },
      });
      if (next) {
        // Try to charge a credit from their best membership.
        const now = new Date();
        const memberships = await tx.membership.findMany({
          where: {
            userId: next.userId,
            status: "ACTIVE",
            expiresAt: { gt: now },
          },
          include: { plan: true },
          orderBy: { expiresAt: "asc" },
        });
        const cost = next.session.classType.creditCost;
        const unlimited = memberships.find((m) => m.plan.kind === "UNLIMITED");
        const pack = memberships.find(
          (m) => m.plan.kind !== "UNLIMITED" && m.creditsRemaining >= cost
        );
        const chosen = unlimited ?? pack;
        if (chosen) {
          const charge = chosen.plan.kind !== "UNLIMITED";
          await tx.booking.update({
            where: { id: next.id },
            data: { status: "BOOKED", membershipId: charge ? chosen.id : null },
          });
          if (charge) {
            await tx.membership.update({
              where: { id: chosen.id },
              data: { creditsRemaining: { decrement: cost } },
            });
          }
          promotedUserId = next.userId;
        }
        // If they have no usable membership, leave them waitlisted.
      }
    }
  });

  return { ok: true, promotedUserId, sessionId: booking.sessionId };
}
