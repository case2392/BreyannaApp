"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser, isStaff, hashPassword } from "@/lib/auth";
import { grantMembership } from "@/lib/membership";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { capacityLimited, dayLabel, timeLabel } from "@/lib/format";
import { bookClass, cancelGuestBooking } from "@/lib/booking";
import { fireAutomation } from "@/lib/automations";

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
  const roomName = String(formData.get("roomName") || "").trim();
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

  // Resolve the chosen location to a room record (create it the first time).
  let roomId: string | null = null;
  if (roomName) {
    const room =
      (await prisma.room.findFirst({ where: { name: roomName } })) ??
      (await prisma.room.create({ data: { name: roomName } }));
    roomId = room.id;
  }

  // Capacity only matters for cycle classes (limited bikes). Other classes are
  // effectively unlimited.
  const entered = Number(formData.get("capacity"));
  const capacity = capacityLimited(classType.name)
    ? entered && entered > 0
      ? entered
      : classType.capacity
    : 100000;

  await prisma.classSession.create({
    data: {
      classTypeId,
      instructorId,
      roomId,
      startsAt,
      capacity,
    },
  });

  revalidatePath("/admin/schedule");
  revalidatePath("/schedule");
  return { ok: true };
}

// Edit an existing class's details (time, instructor, location, etc.) after
// it's been posted. Doesn't touch existing bookings.
export async function updateSession(_prev: unknown, formData: FormData) {
  await requireStaff();

  const sessionId = String(formData.get("sessionId") || "");
  const classTypeId = String(formData.get("classTypeId") || "");
  const instructorId = String(formData.get("instructorId") || "");
  const roomName = String(formData.get("roomName") || "").trim();
  const date = String(formData.get("date") || "");
  const time = String(formData.get("time") || "");

  if (!sessionId) return { error: "Missing class." };
  if (!classTypeId || !instructorId || !date || !time) {
    return { error: "Please fill in class, instructor, date and time." };
  }

  const startsAt = new Date(`${date}T${time}`);
  if (isNaN(startsAt.getTime())) return { error: "Invalid date or time." };

  const classType = await prisma.classType.findUnique({
    where: { id: classTypeId },
  });
  if (!classType) return { error: "Class type not found." };

  // Resolve the chosen location to a room record (create it the first time).
  let roomId: string | null = null;
  if (roomName) {
    const room =
      (await prisma.room.findFirst({ where: { name: roomName } })) ??
      (await prisma.room.create({ data: { name: roomName } }));
    roomId = room.id;
  }

  // Keep the current capacity unless the staff entered a new one; non-cycle
  // classes stay effectively unlimited.
  const existing = await prisma.classSession.findUnique({
    where: { id: sessionId },
    select: { capacity: true },
  });
  if (!existing) return { error: "Class not found." };
  const entered = Number(formData.get("capacity"));
  const capacity = capacityLimited(classType.name)
    ? entered && entered > 0
      ? entered
      : existing.capacity
    : 100000;

  await prisma.classSession.update({
    where: { id: sessionId },
    data: { classTypeId, instructorId, roomId, startsAt, capacity },
  });

  revalidatePath("/admin/schedule");
  revalidatePath(`/admin/schedule/${sessionId}`);
  revalidatePath("/schedule");
  return { ok: true };
}

// Save staff notes about how a class went (no-shows, heads-ups, etc.).
export async function saveSessionNotes(sessionId: string, notes: string) {
  await requireStaff();
  await prisma.classSession.update({
    where: { id: sessionId },
    data: { notes: notes.trim() || null },
  });
  revalidatePath(`/admin/schedule/${sessionId}`);
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

// Manually open/close booking for a single class (independent of the automatic
// 2-hour cutoff). Staff can still add members even when it's closed.
export async function setRegistrationClosed(sessionId: string, closed: boolean) {
  await requireStaff();
  await prisma.classSession.update({
    where: { id: sessionId },
    data: { registrationClosed: closed },
  });
  revalidatePath("/admin/schedule");
  revalidatePath(`/admin/schedule/${sessionId}`);
  revalidatePath("/schedule");
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
      free: formData.get("free") === "on",
      color: String(formData.get("color") || "#6A7A5F"),
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
      guestPassesPerMonth: Number(formData.get("guestPasses")) || 0,
      restrictedClass: String(formData.get("restrictedClass") || "").trim() || null,
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
      guestPassesPerMonth: Number(formData.get("guestPasses")) || 0,
      restrictedClass: String(formData.get("restrictedClass") || "").trim() || null,
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
      free: formData.get("free") === "on",
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

// Staff-set a member's password (helps someone locked out before email reset
// is enabled). The studio shares the new temporary password with the member.
export async function resetMemberPassword(userId: string, newPassword: string) {
  await requireStaff();
  if (newPassword.length < 6)
    return { ok: false, error: "Password must be at least 6 characters." };
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "Member not found." };
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashPassword(newPassword) },
  });
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

// ---- Events (craft nights, workshops, markets, etc.) --------------------

// Build a Date from separate date + optional time inputs. Returns null when no
// date was provided.
function parseEventStart(date: string, time: string): Date | null {
  if (!date) return null;
  const d = new Date(`${date}T${time || "00:00"}`);
  return isNaN(d.getTime()) ? null : d;
}

// The event image is uploaded from the browser directly to Blob storage, so the
// form just carries the resulting URL (or a pasted one). Empty = no image.
function eventImageUrl(formData: FormData): string | null {
  return String(formData.get("imageUrl") || "").trim() || null;
}

export async function createEvent(_prev: unknown, formData: FormData) {
  await requireStaff();
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Event name is required." };

  const price = Number(formData.get("price")) || 0;
  const startsAt = parseEventStart(
    String(formData.get("date") || ""),
    String(formData.get("time") || "")
  );

  const cap = Number(formData.get("capacity"));
  await prisma.event.create({
    data: {
      name,
      description: String(formData.get("description") || "").trim() || null,
      location: String(formData.get("location") || "").trim() || null,
      priceCents: Math.round(price * 100),
      capacity: cap > 0 ? Math.floor(cap) : null,
      startsAt,
      imageUrl: eventImageUrl(formData),
    },
  });
  revalidatePath("/admin/events");
  revalidatePath("/events");
  return { ok: true };
}

export async function updateEvent(_prev: unknown, formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  if (!id || !name) return { error: "Event name is required." };

  const price = Number(formData.get("price")) || 0;
  const startsAt = parseEventStart(
    String(formData.get("date") || ""),
    String(formData.get("time") || "")
  );

  const cap = Number(formData.get("capacity"));
  await prisma.event.update({
    where: { id },
    data: {
      name,
      description: String(formData.get("description") || "").trim() || null,
      location: String(formData.get("location") || "").trim() || null,
      priceCents: Math.round(price * 100),
      capacity: cap > 0 ? Math.floor(cap) : null,
      startsAt,
      imageUrl: eventImageUrl(formData),
      active: formData.get("active") === "on",
    },
  });
  revalidatePath("/admin/events");
  revalidatePath("/events");
  return { ok: true };
}

export async function deleteEvent(eventId: string) {
  await requireStaff();
  await prisma.event.delete({ where: { id: eventId } });
  revalidatePath("/admin/events");
  revalidatePath("/events");
  return { ok: true };
}

// ---- Staff: manually add a member to a class ----------------------------

// Book a member into a class from the CRM. Uses their credits like a normal
// booking (skips the 2-hour cutoff since staff are managing it). Pass comp=true
// to add them without requiring or using credits.
export async function staffAddToClass(
  sessionId: string,
  userId: string,
  comp: boolean
) {
  await requireStaff();
  const result = await bookClass(userId, sessionId, { staff: true, comp });

  if (result.ok) {
    const [user, session] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, firstName: true, email: true, phone: true },
      }),
      prisma.classSession.findUnique({
        where: { id: sessionId },
        include: { classType: true, instructor: true },
      }),
    ]);
    // Let the member know (if the booking-confirmation automation is on).
    if (user && session && result.status === "BOOKED") {
      await fireAutomation(
        "booking_confirmation",
        user,
        {
          className: session.classType.name,
          date: dayLabel(session.startsAt),
          time: timeLabel(session.startsAt),
          instructor: session.instructor.name,
        },
        { classTypeId: session.classTypeId }
      );
    }
    revalidatePath(`/admin/schedule/${sessionId}`);
    revalidatePath("/admin");
  }
  return result;
}

// ---- Reconcile membership renewal dates with Stripe ---------------------

// Pull each Stripe-linked membership's true next-billing date from Stripe and
// overwrite the CRM, so renewal dates always match Stripe regardless of any
// missed or out-of-order webhooks.
export async function syncSubscriptionsFromStripe() {
  await requireStaff();
  if (!stripeEnabled() || !stripe)
    return { ok: false as const, error: "Stripe isn't configured." };

  const memberships = await prisma.membership.findMany({
    where: { stripeSubscriptionId: { not: null } },
  });

  let checked = 0;
  let updated = 0;
  let errors = 0;

  for (const m of memberships) {
    checked++;
    try {
      const sub = await stripe.subscriptions.retrieve(m.stripeSubscriptionId!);
      const active = sub.status === "active" || sub.status === "trialing";
      if (active) {
        const end =
          (sub as any).current_period_end ??
          (sub as any).items?.data?.[0]?.current_period_end;
        await prisma.membership.update({
          where: { id: m.id },
          data: {
            status: "ACTIVE",
            autoRenew: !sub.cancel_at_period_end,
            ...(end ? { expiresAt: new Date(end * 1000) } : {}),
          },
        });
      } else {
        // Canceled/unpaid in Stripe — stop auto-renew but keep their remaining
        // access (don't move the date backward).
        await prisma.membership.update({
          where: { id: m.id },
          data: { autoRenew: false },
        });
      }
      updated++;
    } catch {
      errors++;
    }
  }

  revalidatePath("/admin/members");
  revalidatePath("/admin");
  return { ok: true as const, checked, updated, errors };
}

// ---- Profit & Loss: manual ledger entries -------------------------------

export async function addLedgerEntry(_prev: unknown, formData: FormData) {
  await requireStaff();
  const kind = formData.get("kind") === "REVENUE" ? "REVENUE" : "EXPENSE";
  const description = String(formData.get("description") || "").trim();
  const category = String(formData.get("category") || "").trim() || null;
  const amount = Number(formData.get("amount")) || 0;
  const dateStr = String(formData.get("date") || "");

  if (!description) return { error: "Add a short description." };
  if (amount <= 0) return { error: "Enter an amount greater than zero." };

  // Anchor date-only input at noon so it lands in the intended day/month.
  const occurredAt = dateStr ? new Date(`${dateStr}T12:00:00`) : new Date();
  if (isNaN(occurredAt.getTime())) return { error: "Invalid date." };

  await prisma.ledgerEntry.create({
    data: {
      kind,
      description,
      category,
      amountCents: Math.round(amount * 100),
      occurredAt,
    },
  });
  revalidatePath("/admin/pnl");
  return { ok: true };
}

export async function deleteLedgerEntry(id: string) {
  await requireStaff();
  await prisma.ledgerEntry.delete({ where: { id } });
  revalidatePath("/admin/pnl");
  return { ok: true };
}

// ---- Guest passes -------------------------------------------------------

// Manually grant extra guest passes for the current period (reset on renewal).
export async function addGuestPasses(userId: string, count: number) {
  await requireStaff();
  const n = Math.floor(count);
  if (!n || n <= 0) return { ok: false as const, error: "Enter a number." };
  const m = await prisma.membership.findFirst({
    where: { userId, status: "ACTIVE", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!m)
    return {
      ok: false as const,
      error: "This member has no active membership to add guest passes to.",
    };
  await prisma.membership.update({
    where: { id: m.id },
    data: { guestPassesBonus: { increment: n } },
  });
  revalidatePath(`/admin/members/${userId}`);
  return { ok: true as const };
}

// Staff: remove a guest from a class (refunds the host's pass).
export async function staffCancelGuest(guestBookingId: string) {
  await requireStaff();
  const res = await cancelGuestBooking(guestBookingId);
  if (res.sessionId) revalidatePath(`/admin/schedule/${res.sessionId}`);
  return { ok: res.ok };
}
