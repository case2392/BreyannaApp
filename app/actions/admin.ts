"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser, isStaff, hashPassword } from "@/lib/auth";
import { grantMembership } from "@/lib/membership";
import { stripe, stripeEnabled } from "@/lib/stripe";

async function requireStaff() {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.role)) throw new Error("Not authorized");
  return user;
}

// ---- Schedule --------------------------------------------------------------

export async function createSession(_prev: unknown, formData: FormData) {
  await requireStaff();

  const classTypeId = String(formData.get("classTypeId") || "");
  const instructorId = String(formData.get("instructorId") || "");
  const roomId = String(formData.get("roomId") || "");
  const date = String(formData.get("date") || "");
  const time = String(formData.get("time") || "");

  if (!classTypeId || !instructorId || !date || !time) {
    return { error: "Please fill in class, instructor, date and time." };
  }

  const startsAt = new Date(`${date}T${time}`);
  if (isNaN(startsAt.getTime())) return { error: "Invalid date or time." };

  const classType = await prisma.classType.findUnique({
    where: { id: classTypeId },
  });
  if (!classType) return { error: "Class type not found." };

  const room = roomId
    ? await prisma.room.findUnique({ where: { id: roomId } })
    : null;

  await prisma.classSession.create({
    data: {
      classTypeId,
      instructorId,
      roomId: roomId || null,
      startsAt,
      capacity: room?.capacity ?? classType.capacity,
    },
  });

  revalidatePath("/admin/schedule");
  revalidatePath("/schedule");
  return { ok: true };
}

export async function cancelSession(sessionId: string) {
  await requireStaff();
  await prisma.$transaction([
    prisma.classSession.update({
      where: { id: sessionId },
      data: { cancelled: true },
    }),
    // Refund any credits that were charged for this session.
    ...(await refundSessionBookings(sessionId)),
  ]);
  revalidatePath("/admin/schedule");
  revalidatePath("/schedule");
  return { ok: true };
}

async function refundSessionBookings(sessionId: string) {
  const bookings = await prisma.booking.findMany({
    where: { sessionId, status: { in: ["BOOKED", "WAITLISTED"] }, membershipId: { not: null } },
    include: { session: { include: { classType: true } } },
  });
  const ops = [];
  for (const b of bookings) {
    if (b.membershipId) {
      ops.push(
        prisma.membership.update({
          where: { id: b.membershipId },
          data: {
            creditsRemaining: { increment: b.session.classType.creditCost },
          },
        })
      );
    }
  }
  ops.push(
    prisma.booking.updateMany({
      where: { sessionId, status: { in: ["BOOKED", "WAITLISTED"] } },
      data: { status: "CANCELLED" },
    })
  );
  return ops;
}

export async function markAttendance(
  bookingId: string,
  status: "ATTENDED" | "NO_SHOW" | "BOOKED"
) {
  await requireStaff();
  await prisma.booking.update({ where: { id: bookingId }, data: { status } });
  revalidatePath("/admin/schedule");
  return { ok: true };
}

// ---- Class types & instructors --------------------------------------------

export async function createClassType(_prev: unknown, formData: FormData) {
  await requireStaff();
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Name is required." };

  await prisma.classType.create({
    data: {
      name,
      description: String(formData.get("description") || "").trim() || null,
      duration: Number(formData.get("duration")) || 60,
      capacity: Number(formData.get("capacity")) || 12,
      creditCost: Number(formData.get("creditCost")) || 1,
      color: String(formData.get("color") || "#ec4899"),
    },
  });
  revalidatePath("/admin/classes");
  return { ok: true };
}

export async function createInstructor(_prev: unknown, formData: FormData) {
  await requireStaff();
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Name is required." };

  await prisma.instructor.create({
    data: {
      name,
      bio: String(formData.get("bio") || "").trim() || null,
    },
  });
  revalidatePath("/admin/classes");
  return { ok: true };
}

export async function updateInstructor(_prev: unknown, formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  if (!id || !name) return { error: "Name is required." };
  await prisma.instructor.update({
    where: { id },
    data: { name, bio: String(formData.get("bio") || "").trim() || null },
  });
  revalidatePath("/admin/classes");
  return { ok: true };
}

export async function deleteInstructor(instructorId: string) {
  await requireStaff();
  const inUse = await prisma.classSession.count({ where: { instructorId } });
  if (inUse > 0)
    return {
      ok: false,
      error: "This instructor has classes on the schedule — remove or reassign those first.",
    };
  await prisma.instructor.delete({ where: { id: instructorId } });
  revalidatePath("/admin/classes");
  return { ok: true };
}

// ---- Rooms -----------------------------------------------------------------

export async function createRoom(_prev: unknown, formData: FormData) {
  await requireStaff();
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Name is required." };
  await prisma.room.create({
    data: { name, capacity: Number(formData.get("capacity")) || 12 },
  });
  revalidatePath("/admin/classes");
  return { ok: true };
}

export async function updateRoom(_prev: unknown, formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  if (!id || !name) return { error: "Name is required." };
  await prisma.room.update({
    where: { id },
    data: { name, capacity: Number(formData.get("capacity")) || 12 },
  });
  revalidatePath("/admin/classes");
  return { ok: true };
}

export async function deleteRoom(roomId: string) {
  await requireStaff();
  const inUse = await prisma.classSession.count({ where: { roomId } });
  if (inUse > 0)
    return {
      ok: false,
      error: "This room has classes on the schedule — remove those first.",
    };
  await prisma.room.delete({ where: { id: roomId } });
  revalidatePath("/admin/classes");
  return { ok: true };
}

// ---- Plans -----------------------------------------------------------------

export async function createPlan(_prev: unknown, formData: FormData) {
  await requireStaff();
  const name = String(formData.get("name") || "").trim();
  const kind = String(formData.get("kind") || "PACK") as
    | "UNLIMITED"
    | "PACK"
    | "DROP_IN";
  const price = Number(formData.get("price")) || 0;
  if (!name) return { error: "Name is required." };

  await prisma.membershipPlan.create({
    data: {
      name,
      description: String(formData.get("description") || "").trim() || null,
      kind,
      credits: kind === "UNLIMITED" ? 0 : Number(formData.get("credits")) || 0,
      priceCents: Math.round(price * 100),
      durationDays: Number(formData.get("durationDays")) || 30,
    },
  });
  revalidatePath("/admin/plans");
  revalidatePath("/memberships");
  return { ok: true };
}

export async function togglePlan(planId: string, active: boolean) {
  await requireStaff();
  await prisma.membershipPlan.update({
    where: { id: planId },
    data: { active },
  });
  revalidatePath("/admin/plans");
  revalidatePath("/memberships");
  return { ok: true };
}

export async function updatePlan(_prev: unknown, formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const kind = String(formData.get("kind") || "PACK") as
    | "UNLIMITED"
    | "PACK"
    | "DROP_IN";
  const price = Number(formData.get("price")) || 0;
  if (!id || !name) return { error: "Name is required." };

  await prisma.membershipPlan.update({
    where: { id },
    data: {
      name,
      description: String(formData.get("description") || "").trim() || null,
      kind,
      credits: kind === "UNLIMITED" ? 0 : Number(formData.get("credits")) || 0,
      priceCents: Math.round(price * 100),
      durationDays: Number(formData.get("durationDays")) || 30,
    },
  });
  revalidatePath("/admin/plans");
  revalidatePath("/memberships");
  return { ok: true };
}

export async function deletePlan(planId: string) {
  await requireStaff();
  const inUse = await prisma.membership.count({ where: { planId } });
  if (inUse > 0)
    return {
      ok: false,
      error: "Members have purchased this plan — hide it instead of deleting.",
    };
  await prisma.membershipPlan.delete({ where: { id: planId } });
  revalidatePath("/admin/plans");
  revalidatePath("/memberships");
  return { ok: true };
}

export async function updateClassType(_prev: unknown, formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  if (!id || !name) return { error: "Name is required." };

  await prisma.classType.update({
    where: { id },
    data: {
      name,
      description: String(formData.get("description") || "").trim() || null,
      duration: Number(formData.get("duration")) || 60,
      capacity: Number(formData.get("capacity")) || 12,
      creditCost: Number(formData.get("creditCost")) || 1,
      color: String(formData.get("color") || "#6A7A5F"),
      active: formData.get("active") === "on",
    },
  });
  revalidatePath("/admin/classes");
  revalidatePath("/schedule");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteClassType(classTypeId: string) {
  await requireStaff();
  const inUse = await prisma.classSession.count({ where: { classTypeId } });
  if (inUse > 0)
    return {
      ok: false,
      error: "This class has scheduled sessions — remove them first, or keep it.",
    };
  await prisma.classType.delete({ where: { id: classTypeId } });
  revalidatePath("/admin/classes");
  revalidatePath("/");
  return { ok: true };
}

// ---- Members ---------------------------------------------------------------

export async function saveMemberNotes(userId: string, notes: string) {
  await requireStaff();
  await prisma.user.update({ where: { id: userId }, data: { notes } });
  revalidatePath(`/admin/members/${userId}`);
  return { ok: true };
}

// Manually add a member (e.g. to bring in someone who paid outside the app).
export async function createMember(_prev: unknown, formData: FormData) {
  await requireStaff();
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const password = String(formData.get("password") || "");

  if (!firstName || !lastName || !email)
    return { error: "First name, last name and email are required." };
  if (password.length < 6)
    return { error: "Temporary password must be at least 6 characters." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "A member with that email already exists." };

  await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      phone: phone || null,
      passwordHash: hashPassword(password),
      role: "MEMBER",
    },
  });
  revalidatePath("/admin/members");
  return { ok: true };
}

// Give a member a membership manually. Comps & gifts never expire until
// removed here; use "GIFT" for a sponsored (Sponsor a Sister) membership.
export async function grantMembershipToMember(
  userId: string,
  planId: string,
  source: "COMP" | "GIFT" = "COMP"
) {
  await requireStaff();
  const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
  if (!plan) return { ok: false, error: "Plan not found." };
  await grantMembership(userId, plan, { pricePaidCents: 0, source });
  revalidatePath(`/admin/members/${userId}`);
  return { ok: true };
}

// Remove a single membership from a member (staff). Also cancels a linked
// Stripe subscription if there is one.
export async function removeMembership(membershipId: string) {
  await requireStaff();
  const m = await prisma.membership.findUnique({ where: { id: membershipId } });
  if (!m) return { ok: false, error: "Membership not found." };

  if (m.stripeSubscriptionId && stripeEnabled()) {
    try {
      await stripe!.subscriptions.cancel(m.stripeSubscriptionId);
    } catch {
      // already gone / not found — continue
    }
  }
  await prisma.membership.update({
    where: { id: m.id },
    data: { status: "CANCELLED", autoRenew: false },
  });
  revalidatePath(`/admin/members/${m.userId}`);
  return { ok: true };
}

// Remove a member and all their bookings/memberships.
export async function deleteMember(userId: string) {
  await requireStaff();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "Member not found." };
  if (user.role !== "MEMBER")
    return { ok: false, error: "Only member accounts can be removed here." };

  await prisma.$transaction([
    prisma.booking.deleteMany({ where: { userId } }),
    prisma.membership.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);
  revalidatePath("/admin/members");
  return { ok: true };
}
