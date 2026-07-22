import { prisma } from "./db";
import { capacityLimited } from "./format";
import type { Membership, MembershipPlan } from "@prisma/client";

type MembershipWithPlan = Membership & { plan: MembershipPlan };

// Booking closes this long before a class starts, so the studio has time to
// plan and set up. Members can't book (and don't see) classes inside this window.
export const BOOKING_LEAD_MS = 2 * 60 * 60 * 1000; // 2 hours

export type BookResult =
  | { ok: true; status: "BOOKED" | "WAITLISTED" }
  | { ok: false; error: string };

// How many guest passes a set of memberships makes available right now.
export function availableGuestPasses(
  memberships: {
    plan: { guestPassesPerMonth: number };
    guestPassesBonus: number;
    guestPassesUsed: number;
  }[]
): number {
  return memberships.reduce(
    (sum, m) =>
      sum +
      Math.max(
        0,
        m.plan.guestPassesPerMonth + m.guestPassesBonus - m.guestPassesUsed
      ),
    0
  );
}

// Count how many people currently hold a confirmed spot (members + guests).
async function countBooked(sessionId: string): Promise<number> {
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

// Find the member's usable membership for a given credit cost.
// Prefers UNLIMITED, then the pack expiring soonest with enough credits.
// A membership covers a class if its plan isn't restricted, or the class name
// contains the plan's restriction keyword (e.g. a Mommy & Me membership only
// covers classes with "Mommy" in the name).
export function planCoversClass(
  plan: { restrictedClass: string | null },
  className: string
): boolean {
  const r = plan.restrictedClass?.trim();
  if (!r) return true;
  return className.toLowerCase().includes(r.toLowerCase());
}

async function findUsableMembership(
  userId: string,
  creditCost: number,
  className: string
): Promise<MembershipWithPlan | null> {
  const now = new Date();
  const memberships = await prisma.membership.findMany({
    where: { userId, status: "ACTIVE", expiresAt: { gt: now } },
    include: { plan: true },
    orderBy: { expiresAt: "asc" },
  });

  const usable = memberships.filter((m) => planCoversClass(m.plan, className));

  const unlimited = usable.find((m) => m.plan.kind === "UNLIMITED");
  if (unlimited) return unlimited;

  return (
    usable.find(
      (m) => m.plan.kind !== "UNLIMITED" && m.creditsRemaining >= creditCost
    ) ?? null
  );
}

// Book a member into a class (or waitlist them if it is full).
// Staff booking on a member's behalf can pass opts.staff to skip the 2-hour
// booking cutoff, and opts.comp to add them without requiring/using credits.
export async function bookClass(
  userId: string,
  sessionId: string,
  opts?: { staff?: boolean; comp?: boolean }
): Promise<BookResult> {
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: { classType: true },
  });
  if (!session) return { ok: false, error: "Class not found." };
  if (session.cancelled) return { ok: false, error: "This class was cancelled." };
  if (!opts?.staff && session.registrationClosed)
    return { ok: false, error: "Registration for this class is closed." };
  if (!opts?.staff && session.startsAt.getTime() - Date.now() < BOOKING_LEAD_MS)
    return {
      ok: false,
      error: "Booking has closed — classes lock 2 hours before they start.",
    };

  // Already have a booking? (unique constraint also guards this)
  const existing = await prisma.booking.findUnique({
    where: { userId_sessionId: { userId, sessionId } },
  });
  if (existing && existing.status !== "CANCELLED") {
    return { ok: false, error: "Already on the list for this class." };
  }

  const creditCost = session.classType.creditCost;
  const isFree = session.classType.free;

  // Free community classes (or a staff comp) need no membership or credits.
  let membership: MembershipWithPlan | null = null;
  if (!isFree && !opts?.comp) {
    membership = await findUsableMembership(
      userId,
      creditCost,
      session.classType.name
    );
    if (!membership) {
      // If they have an active membership that just doesn't cover this class
      // style, give a clearer message than "you need a membership".
      const activeCount = await prisma.membership.count({
        where: { userId, status: "ACTIVE", expiresAt: { gt: new Date() } },
      });
      return {
        ok: false,
        error:
          activeCount > 0
            ? "Your membership doesn't cover this class — buy a single class or class pack to book it."
            : "You need an active membership or class pack to book.",
      };
    }
  }

  // Capacity/waitlist only applies to cycle classes (limited bikes); other
  // classes are effectively unlimited and always confirm.
  const limited = capacityLimited(session.classType.name);
  const taken = limited ? await countBooked(sessionId) : 0;
  const isFull = limited && taken >= session.capacity;
  const status = isFull ? "WAITLISTED" : "BOOKED";

  // Only charge a credit for a confirmed spot (not free, not unlimited, not waitlisted).
  const chargeCredit =
    !isFree &&
    status === "BOOKED" &&
    membership !== null &&
    membership.plan.kind !== "UNLIMITED";
  const membershipId = chargeCredit && membership ? membership.id : null;

  await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.booking.update({
        where: { id: existing.id },
        data: {
          status,
          membershipId,
          createdAt: new Date(),
        },
      });
    } else {
      await tx.booking.create({
        data: {
          userId,
          sessionId,
          status,
          membershipId,
        },
      });
    }
    if (membershipId) {
      await tx.membership.update({
        where: { id: membershipId },
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
        const className = next.session.classType.name;
        const usable = memberships.filter((m) => planCoversClass(m.plan, className));
        const unlimited = usable.find((m) => m.plan.kind === "UNLIMITED");
        const pack = usable.find(
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

// ---- Guest passes ---------------------------------------------------------

export type GuestInput = {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
};

// Book a guest into a class using one of the host member's guest passes.
export async function bookGuest(
  hostUserId: string,
  sessionId: string,
  guest: GuestInput,
  opts?: { staff?: boolean }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const firstName = guest.firstName.trim();
  const lastName = guest.lastName.trim();
  const phone = guest.phone.trim();
  const email = (guest.email ?? "").trim() || null;
  if (!firstName || !lastName)
    return { ok: false, error: "Enter the guest's first and last name." };
  if (!phone) return { ok: false, error: "Enter the guest's phone number." };

  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: { classType: true },
  });
  if (!session) return { ok: false, error: "Class not found." };
  if (session.cancelled) return { ok: false, error: "This class was cancelled." };
  if (
    !opts?.staff &&
    (session.registrationClosed ||
      session.startsAt.getTime() - Date.now() < BOOKING_LEAD_MS)
  )
    return { ok: false, error: "Registration for this class is closed." };

  const now = new Date();
  const memberships = await prisma.membership.findMany({
    where: { userId: hostUserId, status: "ACTIVE", expiresAt: { gt: now } },
    include: { plan: true },
  });
  const usable = memberships.find(
    (m) =>
      m.plan.guestPassesPerMonth + m.guestPassesBonus - m.guestPassesUsed > 0
  );
  if (!usable)
    return { ok: false, error: "You don't have any guest passes available." };

  if (capacityLimited(session.classType.name)) {
    const taken = await countBooked(sessionId);
    if (taken >= session.capacity)
      return { ok: false, error: "This class is full." };
  }

  await prisma.$transaction([
    prisma.guestBooking.create({
      data: {
        sessionId,
        hostUserId,
        membershipId: usable.id,
        firstName,
        lastName,
        phone,
        email,
        status: "BOOKED",
      },
    }),
    prisma.membership.update({
      where: { id: usable.id },
      data: { guestPassesUsed: { increment: 1 } },
    }),
  ]);

  return { ok: true };
}

// Cancel a guest booking and refund the pass.
export async function cancelGuestBooking(
  guestBookingId: string
): Promise<{ ok: boolean; sessionId?: string }> {
  const gb = await prisma.guestBooking.findUnique({
    where: { id: guestBookingId },
  });
  if (!gb || gb.status === "CANCELLED") return { ok: false };
  await prisma.$transaction([
    prisma.guestBooking.update({
      where: { id: gb.id },
      data: { status: "CANCELLED" },
    }),
    ...(gb.membershipId
      ? [
          prisma.membership.update({
            where: { id: gb.membershipId },
            data: { guestPassesUsed: { decrement: 1 } },
          }),
        ]
      : []),
  ]);
  return { ok: true, sessionId: gb.sessionId };
}
