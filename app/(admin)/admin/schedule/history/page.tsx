import Link from "next/link";
import { prisma } from "@/lib/db";
import { dayLabel, timeLabel, groupBy, capacityLimited } from "@/lib/format";
import { studioNow } from "@/lib/time";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 40;

export default async function ScheduleHistoryPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  let page = parseInt(searchParams.page ?? "0", 10);
  if (isNaN(page) || page < 0) page = 0;

  // Everything before today (Central). Today's classes stay on the main
  // schedule until the day is over, then roll into this history.
  const startOfToday = studioNow();
  startOfToday.setHours(0, 0, 0, 0);

  const [sessions, total] = await Promise.all([
    prisma.classSession.findMany({
      where: { startsAt: { lt: startOfToday } },
      orderBy: { startsAt: "desc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        classType: { select: { name: true, color: true } },
        instructor: { select: { name: true } },
        room: { select: { name: true } },
        bookings: { select: { status: true } },
        guestBookings: { select: { status: true } },
      },
    }),
    prisma.classSession.count({ where: { startsAt: { lt: startOfToday } } }),
  ]);

  const byDay = groupBy(sessions, (s) => s.startsAt.toDateString());
  const hasMore = (page + 1) * PAGE_SIZE < total;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Past classes</h1>
          <p className="text-sm text-ink-500">
            Look back at previous classes — open one to see the roster, take
            attendance, or add notes.
          </p>
        </div>
        <Link href="/admin/schedule" className="btn-secondary text-sm">
          ← Schedule
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="card p-6 text-center text-ink-500">
          {page === 0
            ? "No past classes yet."
            : "Nothing more to show."}
        </div>
      ) : (
        <div className="space-y-6">
          {[...byDay.entries()].map(([day, list]) => (
            <section key={day}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">
                {dayLabel(new Date(day))}
              </h2>
              <div className="space-y-2">
                {list.map((s) => {
                  const active = s.bookings.filter(
                    (b) => b.status !== "CANCELLED" && b.status !== "WAITLISTED"
                  );
                  const attended = s.bookings.filter(
                    (b) => b.status === "ATTENDED"
                  ).length;
                  const noShow = s.bookings.filter(
                    (b) => b.status === "NO_SHOW"
                  ).length;
                  const cancelled =
                    s.bookings.filter((b) => b.status === "CANCELLED").length +
                    s.guestBookings.filter((g) => g.status === "CANCELLED")
                      .length;
                  const guests = s.guestBookings.filter(
                    (g) => g.status !== "CANCELLED"
                  ).length;
                  const booked = active.length + guests;

                  return (
                    <Link
                      key={s.id}
                      href={`/admin/schedule/${s.id}`}
                      className="card flex items-center gap-4 p-4 transition hover:border-brand-300"
                    >
                      <span
                        className="h-10 w-1.5 rounded-full"
                        style={{ backgroundColor: s.classType.color }}
                      />
                      <div className="w-16 shrink-0">
                        <div className="font-semibold">
                          {timeLabel(s.startsAt)}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">
                            {s.classType.name}
                          </span>
                          {s.cancelled && (
                            <span className="badge bg-red-100 text-red-700">
                              Class cancelled
                            </span>
                          )}
                          {s.notes && (
                            <span className="badge bg-brand-50 text-brand-700">
                              Notes
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-ink-500">
                          {s.instructor.name}
                          {s.room ? ` · ${s.room.name}` : ""}
                        </div>
                      </div>
                      <div className="text-right text-xs text-ink-500">
                        <div className="text-sm font-semibold text-ink-700">
                          {capacityLimited(s.classType.name)
                            ? `${booked}/${s.capacity}`
                            : `${booked} booked`}
                        </div>
                        <div className="flex flex-wrap justify-end gap-x-2">
                          {attended > 0 && (
                            <span className="text-green-700">{attended} present</span>
                          )}
                          {noShow > 0 && (
                            <span className="text-red-600">{noShow} no-show</span>
                          )}
                          {cancelled > 0 && <span>{cancelled} cancelled</span>}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {(page > 0 || hasMore) && (
        <div className="mt-6 flex items-center justify-between">
          {page > 0 ? (
            <Link
              href={`/admin/schedule/history?page=${page - 1}`}
              className="btn-secondary text-sm"
            >
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          {hasMore ? (
            <Link
              href={`/admin/schedule/history?page=${page + 1}`}
              className="btn-secondary text-sm"
            >
              Older →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
