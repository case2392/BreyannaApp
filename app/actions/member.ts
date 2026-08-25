"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  bookClass,
  cancelBooking,
  bookGuest,
  cancelGuestBooking,
} from "@/lib/booking";
import { fireAutomation } from "@/lib/automations";
import { notifyStudio } from "@/lib/notify";
import { dayLabel, timeLabel } from "@/lib/format";

export async function book(sessionId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const result = await bookClass(user.id, sessionId);

  if (result.ok) {
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: { classType: true, instructor: true },
    });
    if (session) {
      const when = `${dayLabel(session.startsAt)} at ${timeLabel(session.startsAt)}`;
      // Member confirmation for a secured spot (not while waitlisted).
      if (result.status === "BOOKED") {
        await fireAutomation(
          "booking_confirmation",
          user,
          {
            className: session.classType.name,
            date: dayLabel(session.startsAt),
            time: timeLabel(session.startsAt),
            instructor: session.instructor.name,
          },
          { classTypeId: session.classType.id }
        );
      }
      // Studio notification for the booking (or waitlist join).
      const verb = result.status === "WAITLISTED" ? "joined the waitlist for" : "booked";
      await notifyStudio(
        `New booking: ${session.classType.name}`,
        `${user.firstName} ${user.lastName} ${verb} ${session.classType.name} on ${when} with ${session.instructor.name}.`
      );
    }
  }

  revalidatePath("/schedule");
  revalidatePath("/bookings");
  return result;
}

// Reserve a spot in an invite-only class via its secret invite link. Booking
// rules (membership/credits, capacity) still apply like any class.
export async function reservePrivateClass(token: string) {
  const user = await getCurrentUser();
  if (!user)
    return { ok: false as const, error: "Please sign in.", needAuth: true };

  const session = await prisma.classSession.findUnique({
    where: { inviteToken: token },
    include: { classType: true, instructor: true },
  });
  if (!session || session.cancelled)
    return { ok: false as const, error: "This class isn't available." };

  const result = await bookClass(user.id, session.id, { allowPrivate: true });

  if (result.ok) {
    const when = `${dayLabel(session.startsAt)} at ${timeLabel(session.startsAt)}`;
    if (result.status === "BOOKED") {
      await fireAutomation(
        "booking_confirmation",
        user,
        {
          className: session.classType.name,
          date: dayLabel(session.startsAt),
          time: timeLabel(session.startsAt),
          instructor: session.instructor.name,
        },
        { classTypeId: session.classType.id }
      );
    }
    await notifyStudio(
      `Private class reservation: ${session.classType.name}`,
      `${user.firstName} ${user.lastName} reserved ${session.classType.name} on ${when}.`
    );
    revalidatePath(`/c/${token}`);
    revalidatePath("/bookings");
  }
  return result;
}

export async function unbook(bookingId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const result = await cancelBooking(user.id, bookingId);

  // Tell the studio about the cancellation.
  if (result.ok && result.sessionId) {
    const session = await prisma.classSession.findUnique({
      where: { id: result.sessionId },
      include: { classType: true },
    });
    if (session) {
      await notifyStudio(
        `Cancellation: ${session.classType.name}`,
        `${user.firstName} ${user.lastName} cancelled ${session.classType.name} on ${dayLabel(session.startsAt)} at ${timeLabel(session.startsAt)}.`
      );
    }
  }

  // Notify whoever was promoted off the waitlist into the freed spot.
  if (result.ok && result.promotedUserId && result.sessionId) {
    const [promoted, session] = await Promise.all([
      prisma.user.findUnique({ where: { id: result.promotedUserId } }),
      prisma.classSession.findUnique({
        where: { id: result.sessionId },
        include: { classType: true },
      }),
    ]);
    if (promoted && session) {
      await fireAutomation(
        "waitlist_promotion",
        promoted,
        {
          className: session.classType.name,
          date: dayLabel(session.startsAt),
          time: timeLabel(session.startsAt),
        },
        { classTypeId: session.classType.id }
      );
    }
  }

  revalidatePath("/schedule");
  revalidatePath("/bookings");
  return result;
}

// Bring a guest to a class using one of the member's guest passes.
export async function bringGuest(
  sessionId: string,
  guest: { firstName: string; lastName: string; phone: string; email?: string }
) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Please sign in." };

  const result = await bookGuest(user.id, sessionId, guest);

  if (result.ok) {
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: { classType: true },
    });
    if (session) {
      await notifyStudio(
        `Guest added: ${session.classType.name}`,
        `${user.firstName} ${user.lastName} brought a guest — ${guest.firstName} ${guest.lastName} (${guest.phone}) — to ${session.classType.name} on ${dayLabel(session.startsAt)} at ${timeLabel(session.startsAt)}.`
      );
    }
    revalidatePath("/schedule");
    revalidatePath("/bookings");
  }
  return result;
}

// Cancel a guest the member previously added (refunds the pass).
export async function cancelGuest(guestBookingId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Please sign in." };
  const gb = await prisma.guestBooking.findUnique({
    where: { id: guestBookingId },
  });
  if (!gb || gb.hostUserId !== user.id)
    return { ok: false as const, error: "Guest not found." };
  await cancelGuestBooking(guestBookingId);
  revalidatePath("/schedule");
  revalidatePath("/bookings");
  return { ok: true as const };
}
