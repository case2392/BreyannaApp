import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { dayLabel, timeLabel } from "@/lib/format";
import { BookButton } from "@/components/BookButton";
import { studioNow } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const user = (await getCurrentUser())!;
  const now = studioNow();

  const bookings = await prisma.booking.findMany({
    where: { userId: user.id, status: { not: "CANCELLED" } },
    include: { session: { include: { classType: true, instructor: true, room: true } } },
    orderBy: { session: { startsAt: "asc" } },
  });

  const upcoming = bookings.filter((b) => b.session.startsAt >= now);
  const past = bookings
    .filter((b) => b.session.startsAt < now)
    .reverse();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">My bookings</h1>
      <p className="mb-6 text-sm text-ink-500">Your upcoming and past classes.</p>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
        Upcoming
      </h2>
      {upcoming.length === 0 ? (
        <div className="card mb-8 p-6 text-center text-ink-500">
          No upcoming classes.{" "}
          <a href="/schedule" className="font-semibold text-brand-600">
            Browse the schedule
          </a>
          .
        </div>
      ) : (
        <div className="mb-8 space-y-3">
          {upcoming.map((b) => (
            <div key={b.id} className="card flex items-center gap-4 p-4">
              <div
                className="hidden h-12 w-1.5 rounded-full sm:block"
                style={{ backgroundColor: b.session.classType.color }}
              />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{b.session.classType.name}</div>
                <div className="text-sm text-ink-500">
                  {dayLabel(b.session.startsAt)} · {timeLabel(b.session.startsAt)}
                </div>
                <div className="text-sm text-ink-500">
                  {b.session.instructor.name}
                  {b.session.room ? ` · ${b.session.room.name}` : ""}
                </div>
                {b.status === "WAITLISTED" && (
                  <span className="badge mt-1 bg-amber-100 text-amber-700">
                    Waitlisted
                  </span>
                )}
              </div>
              <BookButton
                sessionId={b.session.id}
                bookingId={b.id}
                myStatus={b.status === "WAITLISTED" ? "WAITLISTED" : "BOOKED"}
                isFull={false}
                started={false}
              />
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
        Past
      </h2>
      {past.length === 0 ? (
        <div className="card p-6 text-center text-ink-500">No past classes yet.</div>
      ) : (
        <div className="space-y-2">
          {past.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between rounded-xl border border-ink-200 bg-white px-4 py-3"
            >
              <div>
                <div className="font-medium">{b.session.classType.name}</div>
                <div className="text-xs text-ink-500">
                  {dayLabel(b.session.startsAt)} · {timeLabel(b.session.startsAt)}
                </div>
              </div>
              <span className="badge bg-ink-100 text-ink-700">
                {b.status === "ATTENDED" ? "Attended" : b.status === "NO_SHOW" ? "No-show" : "Completed"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
