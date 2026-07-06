import { prisma } from "./db";
import type { User } from "@prisma/client";

// Audience segments the studio can message.
export const AUDIENCES = [
  { key: "all", label: "All members" },
  { key: "active", label: "Active members (current membership)" },
  { key: "lapsed", label: "Lapsed (no active membership)" },
  { key: "upcoming", label: "Members with an upcoming booking" },
] as const;

export type AudienceKey = (typeof AUDIENCES)[number]["key"];

export function audienceLabel(key: string): string {
  if (key === "custom") return "Hand-picked people";
  return AUDIENCES.find((a) => a.key === key)?.label ?? key;
}

async function activeMemberIds(now: Date): Promise<Set<string>> {
  const rows = await prisma.membership.findMany({
    where: { status: "ACTIVE", expiresAt: { gt: now } },
    select: { userId: true },
    distinct: ["userId"],
  });
  return new Set(rows.map((r) => r.userId));
}

// Resolve a segment into the list of members it targets.
export async function resolveAudience(key: string): Promise<User[]> {
  const now = new Date();
  const members = await prisma.user.findMany({
    where: { role: "MEMBER" },
    orderBy: { createdAt: "asc" },
  });

  if (key === "all") return members;

  if (key === "active" || key === "lapsed") {
    const active = await activeMemberIds(now);
    return members.filter((m) =>
      key === "active" ? active.has(m.id) : !active.has(m.id)
    );
  }

  if (key === "upcoming") {
    const rows = await prisma.booking.findMany({
      where: { status: "BOOKED", session: { startsAt: { gt: now } } },
      select: { userId: true },
      distinct: ["userId"],
    });
    const ids = new Set(rows.map((r) => r.userId));
    return members.filter((m) => ids.has(m.id));
  }

  return [];
}

// Recipient counts for every audience (for the compose screen).
export async function audienceCounts(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const a of AUDIENCES) {
    out[a.key] = (await resolveAudience(a.key)).length;
  }
  return out;
}
