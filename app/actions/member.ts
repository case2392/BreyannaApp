"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { bookClass, cancelBooking } from "@/lib/booking";
import { fireAutomation } from "@/lib/automations";
import { dayLabel, timeLabel } from "@/lib/format";

export async function book(sessionId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const result = await bookClass(user.id, sessionId);

  // Confirmation message for a secured spot (not while waitlisted).
  if (result.ok && result.status === "BOOKED") {
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: { classType: true, instructor: true },
    });
    if (session) {
      await fireAutomation("booking_confirmation", user, {
        className: session.classType.name,
        date: dayLabel(session.startsAt),
        time: timeLabel(session.startsAt),
        instructor: session.instructor.name,
      });
    }
  }

  revalidatePath("/schedule");
  revalidatePath("/bookings");
  return result;
}

export async function unbook(bookingId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const result = await cancelBooking(user.id, bookingId);

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
      await fireAutomation("waitlist_promotion", promoted, {
        className: session.classType.name,
        date: dayLabel(session.startsAt),
        time: timeLabel(session.startsAt),
      });
    }
  }

  revalidatePath("/schedule");
  revalidatePath("/bookings");
  return result;
}
