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

// Populate the database with realistic demo data for Dwell Studio. Designed to
// be safe to run from a serverless function (batched writes), and always starts
// from a clean slate so re-running gives a predictable result.
export async function seedDatabase(prisma: PrismaClient): Promise<SeedSummary> {
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
    data: { email: "owner@demo.com", passwordHash: pw, firstName: "Breyanna", lastName: "Broeker", role: "OWNER" },
  });
  const demoMember = await prisma.user.create({
    data: { email: "member@demo.com", passwordHash: pw, firstName: "Demo", lastName: "Member", phone: "(402) 555-0142", role: "MEMBER" },
  });

  // ---- Members (a community of women) -------------------------------------
  const names: [string, string][] = [
    ["Ava", "Johnson"], ["Grace", "Miller"], ["Sophia", "Brown"], ["Olivia", "Davis"],
    ["Mia", "Wilson"], ["Hannah", "Garcia"], ["Isabella", "Martinez"], ["Emma", "Anderson"],
    ["Charlotte", "Taylor"], ["Lily", "Thomas"], ["Amelia", "Moore"], ["Harper", "Lee"],
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
  const [breyanna, hannah, grace, rachel] = await Promise.all([
    prisma.instructor.create({ data: { name: "Breyanna Broeker", bio: "Founder. Cycle & worship." } }),
    prisma.instructor.create({ data: { name: "Hannah Reed", bio: "Strength & sculpt coach." } }),
    prisma.instructor.create({ data: { name: "Grace Olsen", bio: "Dance cardio & sculpt." } }),
    prisma.instructor.create({ data: { name: "Rachel Kim", bio: "Cycle & core." } }),
  ]);
  const [mainStudio, cycleRoom] = await Promise.all([
    prisma.room.create({ data: { name: "Main Studio", capacity: 20 } }),
    prisma.room.create({ data: { name: "Cycle Room", capacity: 16 } }),
  ]);

  // ---- Class types (Dwell's offerings) ------------------------------------
  const dwellCycle = await prisma.classType.create({ data: { name: "Dwell Cycle", description: "Heart-pumping indoor cycling set to worship.", duration: 45, capacity: 16, color: "#E8913C" } });
  const worshipCycle = await prisma.classType.create({ data: { name: "Worship Cycle", description: "Ride and worship — candlelit cycle.", duration: 45, capacity: 16, color: "#B14AA0" } });
  const steadfast = await prisma.classType.create({ data: { name: "Steadfast Cycle & Bible Study", description: "Cycle plus time in the Word.", duration: 60, capacity: 16, color: "#7C5AA6" } });
  const fullBody = await prisma.classType.create({ data: { name: "Full Body Strength", description: "Build full-body strength.", duration: 50, capacity: 18, color: "#7C8454" } });
  const lowerBody = await prisma.classType.create({ data: { name: "Lower Body Sculpt", description: "Targeted lower-body sculpting.", duration: 45, capacity: 18, color: "#C0617F" } });
  const armsCore = await prisma.classType.create({ data: { name: "Arms & Core Sculpt", description: "Sculpt arms and core.", duration: 45, capacity: 18, color: "#D43E63" } });
  const mommyMe = await prisma.classType.create({ data: { name: "Mommy & Me Sculpt", description: "Bring the littles — sculpt together.", duration: 45, capacity: 14, color: "#E1737E" } });
  const danceCardio = await prisma.classType.create({ data: { name: "Dance Cardio", description: "Joyful, sweaty dance cardio.", duration: 45, capacity: 18, color: "#EF6F8E" } });
  const community = await prisma.classType.create({ data: { name: "Community Movement & Bible Study", description: "Saturdays at Dwell — outdoor movement & Bible study for the whole community.", duration: 105, capacity: 24, color: "#939B69" } });

  // ---- Plans ---------------------------------------------------------------
  const unlimited = await prisma.membershipPlan.create({ data: { name: "Unlimited Monthly", description: "Unlimited classes, billed monthly.", kind: "UNLIMITED", priceCents: 12900, durationDays: 30 } });
  const pack8 = await prisma.membershipPlan.create({ data: { name: "8-Class Pack", description: "8 credits, use within 60 days.", kind: "PACK", credits: 8, priceCents: 11200, durationDays: 60 } });
  await prisma.membershipPlan.createMany({
    data: [
      { name: "4-Class Pack", description: "4 credits, use within 45 days.", kind: "PACK", credits: 4, priceCents: 6000, durationDays: 45 },
      { name: "Single Class", description: "One drop-in class.", kind: "DROP_IN", credits: 1, priceCents: 1800, durationDays: 14 },
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
      membershipRows.push({ userId: m.id, planId: pack8.id, creditsRemaining: 6, expiresAt: in60, pricePaidCents: pack8.priceCents });
      bookableUserIds.push(m.id);
    }
  });
  await prisma.membership.createMany({ data: membershipRows });

  // ---- Weekly schedule (Sun = rest day) -----------------------------------
  type Slot = { ct: string; cap: number; instr: string; room: string; h: number; m: number };
  const byWeekday: Record<number, Slot[]> = {
    0: [], // Sunday — rest
    1: [
      { ct: dwellCycle.id, cap: 16, instr: breyanna.id, room: cycleRoom.id, h: 6, m: 0 },
      { ct: mommyMe.id, cap: 14, instr: hannah.id, room: mainStudio.id, h: 9, m: 30 },
      { ct: fullBody.id, cap: 18, instr: grace.id, room: mainStudio.id, h: 18, m: 15 },
    ],
    2: [
      { ct: lowerBody.id, cap: 18, instr: hannah.id, room: mainStudio.id, h: 9, m: 0 },
      { ct: worshipCycle.id, cap: 16, instr: breyanna.id, room: cycleRoom.id, h: 18, m: 15 },
    ],
    3: [
      { ct: steadfast.id, cap: 16, instr: breyanna.id, room: cycleRoom.id, h: 8, m: 15 },
      { ct: armsCore.id, cap: 18, instr: rachel.id, room: mainStudio.id, h: 12, m: 0 },
      { ct: danceCardio.id, cap: 18, instr: grace.id, room: mainStudio.id, h: 18, m: 15 },
    ],
    4: [
      { ct: mommyMe.id, cap: 14, instr: hannah.id, room: mainStudio.id, h: 9, m: 0 },
      { ct: dwellCycle.id, cap: 16, instr: breyanna.id, room: cycleRoom.id, h: 18, m: 15 },
    ],
    5: [
      { ct: fullBody.id, cap: 18, instr: grace.id, room: mainStudio.id, h: 9, m: 0 },
      { ct: worshipCycle.id, cap: 16, instr: rachel.id, room: cycleRoom.id, h: 18, m: 15 },
    ],
    6: [
      { ct: community.id, cap: 24, instr: breyanna.id, room: mainStudio.id, h: 8, m: 15 },
    ],
  };

  const sessionRows: any[] = [];
  for (let day = 0; day < 14; day++) {
    const weekday = at(day, 0).getDay();
    for (const slot of byWeekday[weekday]) {
      sessionRows.push({
        classTypeId: slot.ct,
        instructorId: slot.instr,
        roomId: slot.room,
        startsAt: at(day, slot.h, slot.m),
        capacity: slot.cap,
      });
    }
  }
  await prisma.classSession.createMany({ data: sessionRows });
  const sessions = await prisma.classSession.findMany({ orderBy: { startsAt: "asc" } });

  // ---- Bookings (batched) -------------------------------------------------
  const bookingRows: { userId: string; sessionId: string; status: string }[] = [];
  let counter = 0;
  for (const s of sessions.slice(0, 16)) {
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
