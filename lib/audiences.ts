import { prisma } from "./db";
import type { User } from "@prisma/client";

// Audience segments the studio can message. `group` is just for visual grouping
// in the compose dropdown.
export const AUDIENCES = [
  { key: "all", label: "All members", group: "Quick segments" },
  { key: "active", label: "Active members (any current plan)", group: "Quick segments" },
  { key: "lapsed", label: "Lapsed (no active membership)", group: "Quick segments" },
  { key: "upcoming", label: "Has an upcoming booking", group: "Quick segments" },

  { key: "dropins_unused", label: "Drop In's - Unused", group: "By membership" },
  { key: "dropins_used", label: "Drop In's - Used", group: "By membership" },
  { key: "mommy_members", label: "Mommy & Me members", group: "By membership" },
  { key: "dwell_together_active", label: "Active Dwell Together passes", group: "By membership" },
  { key: "dwell_together_used", label: "Used Dwell Together Pass Holders", group: "By membership" },
  { key: "founding", label: "Founding members", group: "By membership" },
  { key: "pioneer", label: "Pioneer members", group: "By membership" },
  { key: "collective", label: "Dwell Collective members", group: "By membership" },

  { key: "never_attended", label: "Never attended a class", group: "Inactive members" },
  { key: "no_class_14", label: "No class – 14 days", group: "Inactive members" },
  { key: "no_class_30", label: "No class – 30 days", group: "Inactive members" },
  { key: "no_class_90", label: "90 days no response", group: "Inactive members" },
] as const;

export type AudienceKey = (typeof AUDIENCES)[number]["key"];

export function audienceLabel(key: string): string {
  if (key === "custom") return "Hand-picked people";
  return AUDIENCES.find((a) => a.key === key)?.label ?? key;
}

// Keyword matchers against plan names (the studio names its own plans, so we
// match on the distinctive word each plan type contains).
const RX = {
  founding: /founding/i,
  pioneer: /pioneer/i,
  collective: /collective/i,
  mommy: /mommy/i,
  together: /together/i,
};

// Compute the member-id list for every audience in a single pass. Returns a
// map keyed by audience key, each an alphabetically-ordered list of member ids.
export async function audienceMemberIds(): Promise<Record<string, string[]>> {
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;

  const [members, memberships, pastBookings, upcomingRows] = await Promise.all([
    prisma.user.findMany({
      where: { role: "MEMBER" },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true },
    }),
    prisma.membership.findMany({ include: { plan: true } }),
    prisma.booking.findMany({
      where: {
        status: { in: ["BOOKED", "ATTENDED", "NO_SHOW"] },
        session: { startsAt: { lte: now } },
      },
      select: { userId: true, session: { select: { startsAt: true } } },
    }),
    prisma.booking.findMany({
      where: { status: "BOOKED", session: { startsAt: { gt: now } } },
      select: { userId: true },
      distinct: ["userId"],
    }),
  ]);

  const memberIds = members.map((m) => m.id);
  const memberSet = new Set(memberIds);

  const anyActive = new Set<string>();
  const activeUnlimited = new Set<string>();
  const mommy = new Set<string>();
  const founding = new Set<string>();
  const pioneer = new Set<string>();
  const collective = new Set<string>();
  const dtActive = new Set<string>();
  const dtUsed = new Set<string>();
  const boughtDropIn = new Set<string>();
  const dropInUnused = new Set<string>();
  const hasUnusedCredits = new Set<string>();

  for (const m of memberships) {
    if (!memberSet.has(m.userId)) continue;
    const name = m.plan.name;
    const activeNow = m.status === "ACTIVE" && m.expiresAt > now;

    if (activeNow) {
      anyActive.add(m.userId);
      if (m.plan.kind === "UNLIMITED") activeUnlimited.add(m.userId);
      if (
        m.plan.kind === "UNLIMITED" &&
        (RX.mommy.test(name) || RX.mommy.test(m.plan.restrictedClass ?? ""))
      )
        mommy.add(m.userId);
      if (RX.founding.test(name)) founding.add(m.userId);
      if (RX.pioneer.test(name)) pioneer.add(m.userId);
      if (RX.collective.test(name)) collective.add(m.userId);
      if (RX.together.test(name) && m.creditsRemaining > 0) dtActive.add(m.userId);
    }
    // A Dwell Together pass with all credits used up (regardless of active).
    if (RX.together.test(name) && m.creditsRemaining <= 0) dtUsed.add(m.userId);

    // Drop-in purchases (single class / mommy & me drop-in), by usage.
    if (m.plan.kind === "DROP_IN") boughtDropIn.add(m.userId);
    // Any currently-usable credit balance (packs & drop-ins; unlimited plans
    // ignore credits so they never count here).
    if (activeNow && m.creditsRemaining > 0) {
      hasUnusedCredits.add(m.userId);
      if (m.plan.kind === "DROP_IN") dropInUnused.add(m.userId);
    }
  }

  // Most recent past class per member (their "last attended").
  const lastAttended = new Map<string, number>();
  for (const b of pastBookings) {
    if (!memberSet.has(b.userId)) continue;
    const t = b.session.startsAt.getTime();
    if (t > (lastAttended.get(b.userId) ?? 0)) lastAttended.set(b.userId, t);
  }

  const upcoming = new Set(upcomingRows.map((r) => r.userId));

  // Helper: keep alphabetical member order for any set/predicate.
  const order = (pred: (id: string) => boolean) => memberIds.filter(pred);

  const no14: string[] = [];
  const no30: string[] = [];
  const no90: string[] = [];
  for (const id of memberIds) {
    const t = lastAttended.get(id);
    if (!t) continue; // never attended → not in the re-engagement tiers
    const days = Math.floor((now.getTime() - t) / day);
    if (days >= 90) no90.push(id);
    else if (days >= 30) no30.push(id);
    else if (days >= 14) no14.push(id);
  }

  return {
    all: memberIds,
    active: order((id) => anyActive.has(id)),
    lapsed: order((id) => !anyActive.has(id)),
    upcoming: order((id) => upcoming.has(id)),
    dropins_unused: order((id) => dropInUnused.has(id)),
    dropins_used: order(
      (id) =>
        boughtDropIn.has(id) &&
        !hasUnusedCredits.has(id) &&
        !activeUnlimited.has(id)
    ),
    mommy_members: order((id) => mommy.has(id)),
    dwell_together_active: order((id) => dtActive.has(id)),
    dwell_together_used: order(
      (id) => dtUsed.has(id) && !dtActive.has(id) && !activeUnlimited.has(id)
    ),
    founding: order((id) => founding.has(id)),
    pioneer: order((id) => pioneer.has(id)),
    collective: order((id) => collective.has(id)),
    never_attended: order((id) => !lastAttended.has(id)),
    no_class_14: no14,
    no_class_30: no30,
    no_class_90: no90,
  };
}

// Resolve a segment into the list of members it targets (used as a fallback by
// the send action).
export async function resolveAudience(key: string): Promise<User[]> {
  const map = await audienceMemberIds();
  const ids = map[key] ?? [];
  if (ids.length === 0) return [];
  const users = await prisma.user.findMany({ where: { id: { in: ids } } });
  const pos = new Map(ids.map((id, i) => [id, i]));
  return users.sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0));
}
