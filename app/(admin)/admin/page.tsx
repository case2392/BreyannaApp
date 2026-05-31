import Link from "next/link";
import { prisma } from "@/lib/db";
import { money, timeLabel, dayLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="card p-5">
      <div className="text-sm text-ink-500">{label}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-400">{sub}</div>}
    </div>
  );
}

export default async function AdminDashboard() {
  const now = new Date();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    memberCount,
    activeMembers,
    bookingsToday,
    upcoming,
    revenueAgg,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "MEMBER" } }),
    prisma.membership.count({
      where: { status: "ACTIVE", expiresAt: { gt: now } },
    }),
    prisma.booking.count({
      where: {
        status: { in: ["BOOKED", "ATTENDED"] },
        session: { startsAt: { gte: startOfToday, lt: endOfToday } },
      },
    }),
    prisma.classSession.findMany({
      where: { cancelled: false, startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      take: 6,
      include: {
        classType: true,
        instructor: true,
        bookings: {
          where: { status: { in: ["BOOKED", "ATTENDED", "NO_SHOW"] } },
          select: { id: true },
        },
      },
    }),
    prisma.membership.aggregate({
      _sum: { pricePaidCents: true },
      where: { createdAt: { gte: monthStart } },
    }),
  ]);

  const revenue = revenueAgg._sum.pricePaidCents ?? 0;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Dashboard</h1>
      <p className="mb-6 text-sm text-ink-500">
        {dayLabel(now)} — here&apos;s how the studio is doing.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total members" value={String(memberCount)} />
        <Stat label="Active memberships" value={String(activeMembers)} />
        <Stat label="Bookings today" value={String(bookingsToday)} />
        <Stat
          label="Revenue this month"
          value={money(revenue)}
          sub="From membership sales"
        />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Upcoming classes</h2>
        <Link href="/admin/schedule" className="text-sm font-medium text-brand-600">
          Manage schedule →
        </Link>
      </div>

      <div className="mt-3 space-y-2">
        {upcoming.length === 0 && (
          <div className="card p-6 text-center text-ink-500">
            No upcoming classes scheduled.
          </div>
        )}
        {upcoming.map((s) => (
          <div
            key={s.id}
            className="card flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-3">
              <span
                className="h-10 w-1.5 rounded-full"
                style={{ backgroundColor: s.classType.color }}
              />
              <div>
                <div className="font-semibold">{s.classType.name}</div>
                <div className="text-sm text-ink-500">
                  {dayLabel(s.startsAt)} · {timeLabel(s.startsAt)} ·{" "}
                  {s.instructor.name}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">
                {s.bookings.length}/{s.capacity}
              </div>
              <div className="text-xs text-ink-500">booked</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
