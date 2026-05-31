import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

// Build a Date for an upcoming day offset from today at a given hour:minute.
function at(dayOffset: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log("Resetting data…");
  // Order matters because of foreign keys.
  await prisma.booking.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.membershipPlan.deleteMany();
  await prisma.classSession.deleteMany();
  await prisma.classType.deleteMany();
  await prisma.instructor.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();

  const pw = hashPassword("password");

  // ---- Staff & owner -------------------------------------------------------
  const owner = await prisma.user.create({
    data: {
      email: "owner@demo.com",
      passwordHash: pw,
      firstName: "Breyanna",
      lastName: "Owner",
      role: "OWNER",
    },
  });

  // ---- Demo member ---------------------------------------------------------
  const demoMember = await prisma.user.create({
    data: {
      email: "member@demo.com",
      passwordHash: pw,
      firstName: "Demo",
      lastName: "Member",
      phone: "(555) 123-4567",
      role: "MEMBER",
    },
  });

  // ---- Extra members -------------------------------------------------------
  const names: [string, string][] = [
    ["Ava", "Johnson"],
    ["Liam", "Smith"],
    ["Sophia", "Brown"],
    ["Noah", "Davis"],
    ["Mia", "Wilson"],
    ["Ethan", "Garcia"],
    ["Isabella", "Martinez"],
    ["Lucas", "Anderson"],
    ["Charlotte", "Taylor"],
    ["Mason", "Thomas"],
    ["Amelia", "Moore"],
    ["Harper", "Lee"],
  ];
  const members = [demoMember];
  for (const [first, last] of names) {
    const m = await prisma.user.create({
      data: {
        email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
        passwordHash: pw,
        firstName: first,
        lastName: last,
        role: "MEMBER",
      },
    });
    members.push(m);
  }

  // ---- Instructors ---------------------------------------------------------
  const [maya, jordan, priya, alex] = await Promise.all([
    prisma.instructor.create({ data: { name: "Maya Chen", bio: "Yoga & mobility specialist." } }),
    prisma.instructor.create({ data: { name: "Jordan Blake", bio: "HIIT and strength coach." } }),
    prisma.instructor.create({ data: { name: "Priya Nair", bio: "Reformer Pilates instructor." } }),
    prisma.instructor.create({ data: { name: "Alex Rivera", bio: "Spin & endurance coach." } }),
  ]);

  // ---- Rooms ---------------------------------------------------------------
  const [studioA, studioB] = await Promise.all([
    prisma.room.create({ data: { name: "Studio A", capacity: 16 } }),
    prisma.room.create({ data: { name: "Studio B", capacity: 10 } }),
  ]);

  // ---- Class types ---------------------------------------------------------
  const yoga = await prisma.classType.create({
    data: { name: "Vinyasa Yoga", description: "Flowing, breath-led yoga.", duration: 60, capacity: 16, color: "#8b5cf6" },
  });
  const hiit = await prisma.classType.create({
    data: { name: "HIIT Blast", description: "High-intensity interval training.", duration: 45, capacity: 14, color: "#ef4444" },
  });
  const pilates = await prisma.classType.create({
    data: { name: "Reformer Pilates", description: "Low-impact strength & control.", duration: 50, capacity: 10, creditCost: 2, color: "#ec4899" },
  });
  const spin = await prisma.classType.create({
    data: { name: "Spin Ride", description: "Heart-pumping indoor cycling.", duration: 45, capacity: 16, color: "#f59e0b" },
  });
  const strength = await prisma.classType.create({
    data: { name: "Strength 101", description: "Build full-body strength.", duration: 60, capacity: 12, color: "#10b981" },
  });

  // ---- Plans ---------------------------------------------------------------
  const unlimited = await prisma.membershipPlan.create({
    data: { name: "Unlimited Monthly", description: "Unlimited classes, billed monthly.", kind: "UNLIMITED", priceCents: 14900, durationDays: 30 },
  });
  const pack10 = await prisma.membershipPlan.create({
    data: { name: "10-Class Pack", description: "10 credits, use within 90 days.", kind: "PACK", credits: 10, priceCents: 12000, durationDays: 90 },
  });
  await prisma.membershipPlan.create({
    data: { name: "5-Class Pack", description: "5 credits, use within 60 days.", kind: "PACK", credits: 5, priceCents: 6500, durationDays: 60 },
  });
  await prisma.membershipPlan.create({
    data: { name: "Drop-In", description: "Single class.", kind: "DROP_IN", credits: 1, priceCents: 1800, durationDays: 14 },
  });

  // ---- Memberships for members --------------------------------------------
  const in30 = at(30, 23, 59);
  // Demo member: unlimited so booking always works out of the box.
  await prisma.membership.create({
    data: { userId: demoMember.id, planId: unlimited.id, creditsRemaining: 0, expiresAt: in30, pricePaidCents: unlimited.priceCents },
  });
  // Give roughly half the other members an active plan.
  for (let i = 1; i < members.length; i++) {
    if (i % 2 === 0) {
      await prisma.membership.create({
        data: { userId: members[i].id, planId: unlimited.id, creditsRemaining: 0, expiresAt: in30, pricePaidCents: unlimited.priceCents },
      });
    } else if (i % 3 === 0) {
      await prisma.membership.create({
        data: { userId: members[i].id, planId: pack10.id, creditsRemaining: 7, expiresAt: at(60, 23, 59), pricePaidCents: pack10.priceCents },
      });
    }
  }

  // ---- Recurring weekly schedule (next 14 days) ---------------------------
  // Each entry: [classType, instructor, room, hour, minute]
  const weekly: Array<{ day: number; ct: string; instr: string; room: string; h: number; m: number }> = [];
  const template = [
    { ct: yoga.id, instr: maya.id, room: studioA.id, h: 7, m: 0 },
    { ct: hiit.id, instr: jordan.id, room: studioB.id, h: 12, m: 0 },
    { ct: spin.id, instr: alex.id, room: studioA.id, h: 18, m: 0 },
    { ct: pilates.id, instr: priya.id, room: studioB.id, h: 9, m: 30 },
    { ct: strength.id, instr: jordan.id, room: studioA.id, h: 17, m: 30 },
    { ct: yoga.id, instr: maya.id, room: studioA.id, h: 19, m: 0 },
  ];
  for (let day = 0; day < 14; day++) {
    // 3 classes per day, rotating through the template.
    for (let k = 0; k < 3; k++) {
      const t = template[(day + k) % template.length];
      weekly.push({ day, ...t });
    }
  }

  const sessions = [];
  for (const w of weekly) {
    const ct = await prisma.classType.findUnique({ where: { id: w.ct } });
    const room = await prisma.room.findUnique({ where: { id: w.room } });
    const s = await prisma.classSession.create({
      data: {
        classTypeId: w.ct,
        instructorId: w.instr,
        roomId: w.room,
        startsAt: at(w.day, w.h, w.m),
        capacity: room?.capacity ?? ct?.capacity ?? 12,
      },
    });
    sessions.push(s);
  }

  // ---- Seed some bookings so the schedule looks alive ----------------------
  // Members with an active membership.
  const withMembership = await prisma.membership.findMany({
    where: { status: "ACTIVE" },
    select: { userId: true },
    distinct: ["userId"],
  });
  const bookableUserIds = withMembership.map((m) => m.userId);

  let bookingCount = 0;
  for (const s of sessions.slice(0, 18)) {
    // Random-ish fill: between 40% and 110% of capacity (so some waitlist).
    const target = Math.min(
      bookableUserIds.length,
      Math.round(s.capacity * (0.4 + ((bookingCount % 7) / 10)))
    );
    let confirmed = 0;
    for (let i = 0; i < bookableUserIds.length && confirmed < target + 2; i++) {
      const userId = bookableUserIds[(i + bookingCount) % bookableUserIds.length];
      const exists = await prisma.booking.findUnique({
        where: { userId_sessionId: { userId, sessionId: s.id } },
      });
      if (exists) continue;
      const status = confirmed < s.capacity ? "BOOKED" : "WAITLISTED";
      await prisma.booking.create({
        data: { userId, sessionId: s.id, status },
      });
      confirmed++;
      bookingCount++;
    }
  }

  console.log("Seed complete:");
  console.log(`  ${members.length} members, ${sessions.length} sessions, ${bookingCount} bookings`);
  console.log("  Owner login:  owner@demo.com / password");
  console.log("  Member login: member@demo.com / password");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
