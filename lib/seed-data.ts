import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "./password";

// Build a Date for an upcoming day offset from today at a given hour:minute.
function at(dayOffset: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export type SeedSummary = {
  members: number;
  sessions: number;
  bookings: number;
};

// Populate the database with realistic demo data. Designed to be safe to run
// from a serverless function (batched writes to minimise round trips).
// Always starts from a clean slate so re-running gives a predictable result.
export async function seedDatabase(prisma: PrismaClient): Promise<SeedSummary> {
  // Clear existing data (order matters because of foreign keys).
  await prisma.booking.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.membershipPlan.deleteMany();
  await prisma.classSession.deleteMany();
  await prisma.classType.deleteMany();
  await prisma.instructor.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();

  const pw = hashPassword("password");

  // ---- Owner + demo member -------------------------------------------------
  const owner = await prisma.user.create({
    data: { email: "owner@demo.com", passwordHash: pw, firstName: "Breyanna", lastName: "Owner", role: "OWNER" },
  });
  const demoMember = await prisma.user.create({
    data: { email: "member@demo.com", passwordHash: pw, firstName: "Demo", lastName: "Member", phone: "(555) 123-4567", role: "MEMBER" },
  });

  // ---- Extra members (batched) --------------------------------------------
  const names: [string, string][] = [
    ["Ava", "Johnson"], ["Liam", "Smith"], ["Sophia", "Brown"], ["Noah", "Davis"],
    ["Mia", "Wilson"], ["Ethan", "Garcia"], ["Isabella", "Martinez"], ["Lucas", "Anderson"],
    ["Charlotte", "Taylor"], ["Mason", "Thomas"], ["Amelia", "Moore"], ["Harper", "Lee"],
  ];
  await prisma.user.createMany({
    data: names.map(([first, last]) => ({
      email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
      passwordHash: pw,
      firstName: first,
      lastName: last,
      role: "MEMBER",
    })),
  });
  const extraMembers = await prisma.user.findMany({
    where: { role: "MEMBER", email: { not: "member@demo.com" } },
    orderBy: { createdAt: "asc" },
  });
  const members = [demoMember, ...extraMembers];

  // ---- Instructors & rooms -------------------------------------------------
  const [maya, jordan, priya, alex] = await Promise.all([
    prisma.instructor.create({ data: { name: "Maya Chen", bio: "Yoga & mobility specialist." } }),
    prisma.instructor.create({ data: { name: "Jordan Blake", bio: "HIIT and strength coach." } }),
    prisma.instructor.create({ data: { name: "Priya Nair", bio: "Reformer Pilates instructor." } }),
    prisma.instructor.create({ data: { name: "Alex Rivera", bio: "Spin & endurance coach." } }),
  ]);
  const [studioA, studioB] = await Promise.all([
    prisma.room.create({ data: { name: "Studio A", capacity: 16 } }),
    prisma.room.create({ data: { name: "Studio B", capacity: 10 } }),
  ]);

  // ---- Class types ---------------------------------------------------------
  const [yoga, hiit, pilates, spin, strength] = await Promise.all([
    prisma.classType.create({ data: { name: "Vinyasa Yoga", description: "Flowing, breath-led yoga.", duration: 60, capacity: 16, color: "#8b5cf6" } }),
    prisma.classType.create({ data: { name: "HIIT Blast", description: "High-intensity interval training.", duration: 45, capacity: 14, color: "#ef4444" } }),
    prisma.classType.create({ data: { name: "Reformer Pilates", description: "Low-impact strength & control.", duration: 50, capacity: 10, creditCost: 2, color: "#ec4899" } }),
    prisma.classType.create({ data: { name: "Spin Ride", description: "Heart-pumping indoor cycling.", duration: 45, capacity: 16, color: "#f59e0b" } }),
    prisma.classType.create({ data: { name: "Strength 101", description: "Build full-body strength.", duration: 60, capacity: 12, color: "#10b981" } }),
  ]);

  // ---- Plans ---------------------------------------------------------------
  const unlimited = await prisma.membershipPlan.create({
    data: { name: "Unlimited Monthly", description: "Unlimited classes, billed monthly.", kind: "UNLIMITED", priceCents: 14900, durationDays: 30 },
  });
  const pack10 = await prisma.membershipPlan.create({
    data: { name: "10-Class Pack", description: "10 credits, use within 90 days.", kind: "PACK", credits: 10, priceCents: 12000, durationDays: 90 },
  });
  await prisma.membershipPlan.createMany({
    data: [
      { name: "5-Class Pack", description: "5 credits, use within 60 days.", kind: "PACK", credits: 5, priceCents: 6500, durationDays: 60 },
      { name: "Drop-In", description: "Single class.", kind: "DROP_IN", credits: 1, priceCents: 1800, durationDays: 14 },
    ],
  });

  // ---- Memberships (batched) ----------------------------------------------
  const in30 = at(30, 23, 59);
  const in60 = at(60, 23, 59);
  const membershipRows: any[] = [
    { userId: demoMember.id, planId: unlimited.id, creditsRemaining: 0, expiresAt: in30, pricePaidCents: unlimited.priceCents },
  ];
  const bookableUserIds = [demoMember.id];
  extraMembers.forEach((m, idx) => {
    const i = idx + 1;
    if (i % 2 === 0) {
      membershipRows.push({ userId: m.id, planId: unlimited.id, creditsRemaining: 0, expiresAt: in30, pricePaidCents: unlimited.priceCents });
      bookableUserIds.push(m.id);
    } else if (i % 3 === 0) {
      membershipRows.push({ userId: m.id, planId: pack10.id, creditsRemaining: 7, expiresAt: in60, pricePaidCents: pack10.priceCents });
      bookableUserIds.push(m.id);
    }
  });
  await prisma.membership.createMany({ data: membershipRows });

  // ---- Recurring schedule (next 14 days, batched) -------------------------
  const template = [
    { ct: yoga.id, instr: maya.id, room: studioA.id, cap: 16, h: 7, m: 0 },
    { ct: hiit.id, instr: jordan.id, room: studioB.id, cap: 10, h: 12, m: 0 },
    { ct: spin.id, instr: alex.id, room: studioA.id, cap: 16, h: 18, m: 0 },
    { ct: pilates.id, instr: priya.id, room: studioB.id, cap: 10, h: 9, m: 30 },
    { ct: strength.id, instr: jordan.id, room: studioA.id, cap: 12, h: 17, m: 30 },
    { ct: yoga.id, instr: maya.id, room: studioA.id, cap: 16, h: 19, m: 0 },
  ];
  const sessionRows: any[] = [];
  for (let day = 0; day < 14; day++) {
    for (let k = 0; k < 3; k++) {
      const t = template[(day + k) % template.length];
      sessionRows.push({
        classTypeId: t.ct,
        instructorId: t.instr,
        roomId: t.room,
        startsAt: at(day, t.h, t.m),
        capacity: t.cap,
      });
    }
  }
  await prisma.classSession.createMany({ data: sessionRows });
  const sessions = await prisma.classSession.findMany({ orderBy: { startsAt: "asc" } });

  // ---- Bookings (batched) -------------------------------------------------
  const bookingRows: { userId: string; sessionId: string; status: string }[] = [];
  let counter = 0;
  for (const s of sessions.slice(0, 18)) {
    const target = Math.min(
      bookableUserIds.length,
      Math.round(s.capacity * (0.4 + ((counter % 7) / 10)))
    );
    let confirmed = 0;
    const usedInSession = new Set<string>();
    for (let i = 0; i < bookableUserIds.length && confirmed < target + 2; i++) {
      const userId = bookableUserIds[(i + counter) % bookableUserIds.length];
      if (usedInSession.has(userId)) continue;
      usedInSession.add(userId);
      const status = confirmed < s.capacity ? "BOOKED" : "WAITLISTED";
      bookingRows.push({ userId, sessionId: s.id, status });
      confirmed++;
      counter++;
    }
  }
  await prisma.booking.createMany({ data: bookingRows, skipDuplicates: true });

  return { members: members.length, sessions: sessions.length, bookings: bookingRows.length };
}
