"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { bookClass, cancelBooking } from "@/lib/booking";

export async function book(sessionId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const result = await bookClass(user.id, sessionId);
  revalidatePath("/schedule");
  revalidatePath("/bookings");
  return result;
}

export async function unbook(bookingId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const result = await cancelBooking(user.id, bookingId);
  revalidatePath("/schedule");
  revalidatePath("/bookings");
  return result;
}

// "Buy" a membership plan. Payments are out of scope for this version, so this
// records the purchase and grants credits immediately.
export async function purchasePlan(planId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
  if (!plan || !plan.active) return { ok: false, error: "Plan not available." };

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + plan.durationDays);

  await prisma.membership.create({
    data: {
      userId: user.id,
      planId: plan.id,
      status: "ACTIVE",
      creditsRemaining: plan.kind === "UNLIMITED" ? 0 : plan.credits,
      expiresAt,
      pricePaidCents: plan.priceCents,
    },
  });

  revalidatePath("/memberships");
  revalidatePath("/schedule");
  return { ok: true };
}
