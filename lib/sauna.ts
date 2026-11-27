// Infrared sauna — server side: settings storage, availability, booking and
// cancelling. Credits work like class packs: a single session or pack is
// charged per person; Unlimited covers the member themself.

import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { studioNow } from "./time";
import { notifyStudio } from "./notify";
import { sendEmail } from "./messaging";
import { applySaunaIncludedDefaults } from "./saunaDefaults";
import {
  type Busy,
  type SaunaSettings,
  bookableDays,
  dayKey,
  dayLabelLong,
  daySlots,
  normalizeSaunaSettings,
  rangeLabel,
} from "./saunaShared";

const KEY = "sauna";
const MIN = 60 * 1000;

export async function getSaunaSettings(): Promise<SaunaSettings> {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: KEY } });
    return normalizeSaunaSettings(row ? JSON.parse(row.value) : {});
  } catch {
    return normalizeSaunaSettings({});
  }
}

export async function saveSaunaSettings(s: SaunaSettings) {
  const value = JSON.stringify(normalizeSaunaSettings(s));
  await prisma.appSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value },
    update: { value },
  });
}

// Calendar month of a wall-clock date: "2026-11", and its start/end.
export const monthKey = (d: Date) => d.toISOString().slice(0, 7);
function monthRange(d: Date) {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  return { start, end };
}

// Included sauna sessions a membership has used in the month of `d`. Late
// cancels still count; on-time cancels give the session back.
type Db = Pick<typeof prisma, "saunaBooking">;
export async function includedUsedInMonth(membershipId: string, d: Date, db: Db = prisma) {
  const { start, end } = monthRange(d);
  return db.saunaBooking.count({
    where: {
      membershipId,
      usedIncluded: true,
      startsAt: { gte: start, lt: end },
      OR: [{ status: { in: ["BOOKED", "ATTENDED", "NO_SHOW"] } }, { lateCancel: true }],
    },
  });
}

// Everything that lets a member use the sauna, best first:
//  - unlimited: a sauna Unlimited plan, or a class membership with unlimited
//    sauna included (e.g. Dwell Collective)
//  - included: class memberships with N sauna sessions a month (e.g. Pioneer)
//  - packs: sauna single sessions / packs (credits)
export async function saunaMemberships(userId: string) {
  await applySaunaIncludedDefaults();
  const list = await prisma.membership.findMany({
    where: {
      userId,
      status: "ACTIVE",
      expiresAt: { gt: new Date() },
      OR: [{ plan: { category: "SAUNA" } }, { plan: { saunaPerMonth: { not: 0 } } }],
    },
    include: { plan: true },
    orderBy: { expiresAt: "asc" },
  });
  const sauna = list.filter((m) => m.plan.category === "SAUNA");
  const classPlans = list.filter((m) => m.plan.category !== "SAUNA");
  const unlimited =
    sauna.find((m) => m.plan.kind === "UNLIMITED") ??
    classPlans.find((m) => m.plan.saunaPerMonth < 0) ??
    null;
  const included = classPlans
    .filter((m) => m.plan.saunaPerMonth > 0)
    .sort((a, b) => b.plan.saunaPerMonth - a.plan.saunaPerMonth);
  const packs = sauna.filter((m) => m.plan.kind !== "UNLIMITED" && m.creditsRemaining > 0);
  const credits = packs.reduce((n, m) => n + m.creditsRemaining, 0);
  return { unlimited, included, packs, credits };
}

// Included sessions left per membership for each month — for the booking
// screen (it can span two months).
export async function includedLeftByMonth(
  included: { id: string; plan: { saunaPerMonth: number } }[],
  months: Date[]
) {
  const out: Record<string, Record<string, number>> = {};
  for (const m of included) {
    out[m.id] = {};
    for (const d of months) {
      const used = await includedUsedInMonth(m.id, d);
      out[m.id][monthKey(d)] = Math.max(0, m.plan.saunaPerMonth - used);
    }
  }
  return out;
}

// Everything that makes the sauna unavailable between two times.
async function busyBetween(from: Date, to: Date, userId?: string): Promise<Busy[]> {
  const [bookings, blocks] = await Promise.all([
    prisma.saunaBooking.findMany({
      where: {
        status: { in: ["BOOKED", "ATTENDED", "NO_SHOW"] },
        startsAt: { lt: to },
        endsAt: { gt: new Date(from.getTime() - 3 * 60 * MIN) },
      },
      select: { startsAt: true, endsAt: true, userId: true },
    }),
    prisma.saunaBlock.findMany({
      where: { startsAt: { lt: to }, endsAt: { gt: from } },
      select: { startsAt: true, endsAt: true },
    }),
  ]);
  return [
    ...bookings.map((b) => ({ startsAt: b.startsAt, endsAt: b.endsAt, mine: b.userId === userId })),
    ...blocks.map((b) => ({ ...b, blocked: true })),
  ];
}

// Availability for the whole booking window, for the booking screen.
export async function saunaAvailability(
  s: SaunaSettings,
  userId?: string,
  opts: { ignoreNotice?: boolean; days?: string[] } = {}
) {
  const now = studioNow();
  const days = opts.days ?? bookableDays(now, s);
  if (days.length === 0) return [];
  const from = new Date(`${days[0]}T00:00:00Z`);
  const to = new Date(new Date(`${days[days.length - 1]}T00:00:00Z`).getTime() + 24 * 60 * MIN);
  const busy = await busyBetween(from, to, userId);
  return days.map((day) => ({
    day,
    slots: daySlots(day, s, busy, now, opts),
  }));
}

export type SaunaBookInput = {
  userId: string;
  startsAt: string; // ISO of the slot start
  people?: number;
  guestNames?: string;
  acceptGuidelines?: boolean;
  // Staff booking on a member's behalf: skips notice/daily limit, and with
  // comp=true doesn't use a session.
  staff?: boolean;
  comp?: boolean;
};

export async function bookSauna(
  input: SaunaBookInput
): Promise<{ ok: true; id: string } | { ok: false; error: string; needPlan?: boolean }> {
  const s = await getSaunaSettings();
  if (!s.enabled && !input.staff)
    return { ok: false, error: "Sauna booking isn't open yet." };

  const start = new Date(input.startsAt);
  if (isNaN(start.getTime())) return { ok: false, error: "Please pick a time." };
  const day = dayKey(start);
  const people = Math.min(s.maxPeople, Math.max(1, Math.round(input.people ?? 1)));

  // Must be a real, open slot.
  const [avail] = await saunaAvailability(s, input.userId, {
    days: [day],
    ignoreNotice: input.staff,
  });
  const slot = avail?.slots.find((x) => x.start.getTime() === start.getTime());
  if (!slot) return { ok: false, error: "That time isn't available — please pick another." };
  if (slot.status === "mine") return { ok: false, error: "You already have this time booked." };
  if (slot.status === "taken" || slot.status === "blocked")
    return { ok: false, error: "Sorry — that time was just taken. Please pick another." };
  if (slot.status === "past")
    return { ok: false, error: "That time is too soon to book — please pick a later one." };
  if (!input.staff) {
    const now = studioNow();
    const last = new Date(`${dayKey(now)}T00:00:00Z`).getTime() + s.bookAheadDays * 24 * 60 * MIN;
    if (start.getTime() >= last)
      return { ok: false, error: `You can book up to ${s.bookAheadDays} days ahead.` };
  }

  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) return { ok: false, error: "Member not found." };

  // Safety guidelines: asked once.
  if (!input.staff && !user.saunaWaiverAt) {
    if (!input.acceptGuidelines)
      return { ok: false, error: "Please read and agree to the sauna guidelines first." };
    await prisma.user.update({ where: { id: user.id }, data: { saunaWaiverAt: new Date() } });
  }

  // One (or N) sessions per member per day.
  if (!input.staff && s.dailyLimit > 0) {
    const dayStart = new Date(`${day}T00:00:00Z`);
    const mine = await prisma.saunaBooking.count({
      where: {
        userId: user.id,
        status: { in: ["BOOKED", "ATTENDED"] },
        startsAt: { gte: dayStart, lt: new Date(dayStart.getTime() + 24 * 60 * MIN) },
      },
    });
    if (mine >= s.dailyLimit)
      return {
        ok: false,
        error:
          s.dailyLimit === 1
            ? "You already have a sauna session that day — one per day keeps times open for everyone."
            : `You can book up to ${s.dailyLimit} sauna sessions per day.`,
      };
  }

  // What pays for it. The member is covered by an unlimited plan, else one of
  // their included monthly sessions, else a sauna pack; each guest uses a
  // sauna session from a pack.
  let membershipId: string | null = null;
  let packId: string | null = null;
  let creditsUsed = 0;
  let usedIncluded = false;
  let includedLimit = 0;
  if (!input.comp) {
    const { unlimited, included, packs } = await saunaMemberships(user.id);
    let cover: string | null = unlimited?.id ?? null;
    let usedUp: (typeof included)[number] | null = null;
    if (!cover) {
      for (const m of included) {
        const used = await includedUsedInMonth(m.id, start);
        if (used < m.plan.saunaPerMonth) {
          cover = m.id;
          usedIncluded = true;
          includedLimit = m.plan.saunaPerMonth;
          break;
        }
        usedUp = usedUp ?? m;
      }
    }
    const need = cover ? people - 1 : people;
    if (need > 0) {
      const pack = packs.find((m) => m.creditsRemaining >= need);
      if (!pack) {
        const month = start.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
        return {
          ok: false,
          needPlan: true,
          error: cover
            ? `You're covered — each guest needs a sauna session (${need} needed).`
            : usedUp
            ? `You've used your ${usedUp.plan.saunaPerMonth} included sauna session${usedUp.plan.saunaPerMonth === 1 ? "" : "s"} for ${month} with your ${usedUp.plan.name}. Add a session or pack to book more.`
            : packs.length > 0
            ? `This needs ${need} sauna session${need === 1 ? "" : "s"} and you don't have enough left.`
            : "You'll need a sauna session, pack or membership to book.",
        };
      }
      creditsUsed = need;
      if (cover) packId = pack.id;
      else cover = pack.id;
    }
    membershipId = cover;
  }

  const end = new Date(start.getTime() + s.sessionMinutes * MIN);
  try {
    const booking = await prisma.$transaction(
      async (tx) => {
        // Re-check for a clash inside the transaction (two people tapping the
        // same time at once).
        const buffer = s.bufferMinutes * MIN;
        const clash = await tx.saunaBooking.findFirst({
          where: {
            status: { in: ["BOOKED", "ATTENDED", "NO_SHOW"] },
            startsAt: { lt: new Date(end.getTime() + buffer) },
            endsAt: { gt: new Date(start.getTime() - buffer) },
          },
          select: { id: true },
        });
        if (clash) throw new Error("TAKEN");
        // Re-check the monthly allowance (two bookings at once).
        if (usedIncluded && membershipId) {
          const used = await includedUsedInMonth(membershipId, start, tx);
          if (used >= includedLimit) throw new Error("NO_INCLUDED");
        }
        if (creditsUsed > 0) {
          const charged = await tx.membership.updateMany({
            where: { id: packId ?? membershipId!, creditsRemaining: { gte: creditsUsed } },
            data: { creditsRemaining: { decrement: creditsUsed } },
          });
          if (charged.count === 0) throw new Error("NO_CREDITS");
        }
        return tx.saunaBooking.create({
          data: {
            userId: user.id,
            startsAt: start,
            endsAt: end,
            people,
            guestNames: input.guestNames?.trim().slice(0, 200) || null,
            membershipId,
            packId,
            creditsUsed,
            usedIncluded,
            bookedBy: input.staff ? "STAFF" : "MEMBER",
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    // Confirmations (best effort — never block the booking).
    const when = `${dayLabelLong(start)}, ${rangeLabel(start, end)}`;
    await notifyStudio(
      `Sauna booked: ${user.firstName} ${user.lastName}`,
      `${user.firstName} ${user.lastName} booked the sauna for ${when}` +
        (people > 1 ? ` (${people} people)` : "") +
        (input.staff ? " — booked by staff." : ".")
    );
    if (user.email) {
      await sendEmail(
        user.email,
        `Your sauna session — ${when}`,
        `Hi ${user.firstName},\n\nYou're booked for the ${s.name}:\n${when}` +
          (people > 1 ? ` · ${people} people` : "") +
          `\n\nPlease arrive about 5 minutes early and bring water. Your time starts at your reserved time.\n\n` +
          (s.cancelHours > 0
            ? `Need to cancel? Cancel from your account at least ${s.cancelHours} hour${s.cancelHours === 1 ? "" : "s"} before and you'll get your session back.\n\n`
            : "") +
          `See you soon!\nDwell Studio`
      ).catch(() => {});
    }
    return { ok: true, id: booking.id };
  } catch (e: any) {
    if (e?.message === "NO_CREDITS")
      return { ok: false, needPlan: true, error: "You don't have enough sauna sessions left." };
    if (e?.message === "NO_INCLUDED")
      return {
        ok: false,
        needPlan: true,
        error: "You've used your included sauna sessions for this month.",
      };
    if (
      e?.message === "TAKEN" ||
      (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034")
    )
      return { ok: false, error: "Sorry — that time was just taken. Please pick another." };
    throw e;
  }
}

// Cancel a sauna booking. Members get their session(s) back when they cancel
// in time; staff choose whether to refund.
export async function cancelSauna(
  bookingId: string,
  opts: { userId?: string; staff?: boolean; refund?: boolean }
): Promise<{ ok: true; refunded: boolean } | { ok: false; error: string }> {
  const b = await prisma.saunaBooking.findUnique({ where: { id: bookingId } });
  if (!b || (opts.userId && b.userId !== opts.userId))
    return { ok: false, error: "Booking not found." };
  if (b.status !== "BOOKED") return { ok: false, error: "This booking isn't active." };

  const s = await getSaunaSettings();
  const now = studioNow();
  if (!opts.staff && b.startsAt.getTime() <= now.getTime())
    return { ok: false, error: "This session has already started." };
  const inTime = b.startsAt.getTime() - now.getTime() >= s.cancelHours * 60 * MIN;
  const refund = opts.staff ? opts.refund !== false : inTime;

  await prisma.$transaction(async (tx) => {
    const updated = await tx.saunaBooking.updateMany({
      where: { id: b.id, status: "BOOKED" },
      // A late cancel still counts against an included monthly session.
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        lateCancel: !refund && b.usedIncluded,
      },
    });
    const packId = b.packId ?? b.membershipId;
    if (updated.count > 0 && refund && packId && b.creditsUsed > 0) {
      await tx.membership.update({
        where: { id: packId },
        data: { creditsRemaining: { increment: b.creditsUsed } },
      });
    }
  });
  return { ok: true, refunded: refund && (b.creditsUsed > 0 || b.usedIncluded) };
}

// Upcoming sauna sessions for a member.
export function upcomingSaunaBookings(userId: string) {
  const now = studioNow();
  return prisma.saunaBooking.findMany({
    where: {
      userId,
      status: "BOOKED",
      endsAt: { gt: now },
    },
    orderBy: { startsAt: "asc" },
    include: { membership: { include: { plan: true } } },
  });
}
