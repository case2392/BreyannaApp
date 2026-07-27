import Link from "next/link";
import { prisma } from "@/lib/db";
import { money, timeLabel, dayLabel, capacityLimited } from "@/lib/format";
import { studioNow } from "@/lib/time";

export const dynamic = "force-dynamic";

function Stat({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="text-sm text-ink-500">{label}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-400">{sub}</div>}
    </>
  );
  if (href) {
    return (
      <Link href={href} className="card card-interactive block p-5">
        {inner}
      </Link>
    );
  }
  return <div className="card p-5">{inner}</div>;
}

export default async function AdminDashboard() {
  const now = studioNow();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    memberCount,
    activeMembers,
    bookingsToday,
    todaySessions,
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
    // Every class scheduled today (including ones already started) with the
    // full roster, so staff can see who's coming and take attendance.
    prisma.classSession.findMany({
      where: {
        cancelled: false,
        startsAt: { gte: startOfToday, lt: endOfToday },
      },
      orderBy: { startsAt: "asc" },
      include: {
        classType: true,
        instructor: true,
        room: true,
        bookings: {
          where: {
            status: { in: ["BOOKED", "ATTENDED", "NO_SHOW", "WAITLISTED"] },
          },
          include: { user: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.classSession.findMany({
      // From now onward — today's classes stay here until their start time
      // passes, then future days.
      where: { cancelled: false, startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      take: 8,
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
          sub="Profit & loss →"
          href="/admin/pnl"
        />
      </div>

      {/* Today's classes + rosters */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Today&apos;s classes</h2>
        <Link href="/admin/schedule" className="text-sm font-medium text-brand-600">
          Full schedule →
        </Link>
      </div>

      <div className="mt-3 space-y-3">
        {todaySessions.length === 0 && (
          <div className="card p-6 text-center text-ink-500">
            No classes scheduled for today.
          </div>
        )}
        {todaySessions.map((s) => {
          const confirmed = s.bookings.filter((b) => b.status !== "WAITLISTED");
          const waitlist = s.bookings.filter((b) => b.status === "WAITLISTED");
          const countLabel = capacityLimited(s.classType.name)
            ? `${confirmed.length}/${s.capacity}`
            : `${confirmed.length} booked`;
          return (
            <div key={s.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span
                    className="h-10 w-1.5 rounded-full"
                    style={{ backgroundColor: s.classType.color }}
                  />
                  <div>
                    <div className="font-semibold">{s.classType.name}</div>
                    <div className="text-sm text-ink-500">
                      {timeLabel(s.startsAt)} · {s.instructor.name}
                      {s.room ? ` · ${s.room.name}` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{countLabel}</span>
                  <Link
                    href={`/admin/schedule/${s.id}`}
                    className="btn-secondary text-xs"
                  >
                    Roster
                  </Link>
                </div>
              </div>

              <div className="mt-3 border-t border-ink-100 pt-3">
                {confirmed.length === 0 ? (
                  <p className="text-sm text-ink-400">No-one booked yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {confirmed.map((b) => (
                      <span
                        key={b.id}
                        className="badge bg-brand-50 text-brand-700"
                      >
                        {b.user.firstName} {b.user.lastName}
                      </span>
                    ))}
                  </div>
                )}
                {waitlist.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-wide text-ink-400">
                      Waitlist
                    </span>
                    {waitlist.map((b) => (
                      <span
                        key={b.id}
                        className="badge bg-amber-100 text-amber-700"
                      >
                        {b.user.firstName} {b.user.lastName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
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
                {capacityLimited(s.classType.name)
                  ? `${s.bookings.length}/${s.capacity}`
                  : s.bookings.length}
              </div>
              <div className="text-xs text-ink-500">booked</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
