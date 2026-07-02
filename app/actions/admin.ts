"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser, isStaff } from "@/lib/auth";

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
