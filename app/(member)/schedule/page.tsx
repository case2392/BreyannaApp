import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { dayLabel, timeLabel, groupBy } from "@/lib/format";
import { BookButton } from "@/components/BookButton";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const user = (await getCurrentUser())!;

  const now = new Date();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 14);

  const sessions = await prisma.classSession.findMany({
    where: { cancelled: false, startsAt: { gte: now, lte: horizon } },
    orderBy: { startsAt: "asc" },
    include: {
      classType: true,
      instructor: true,
      room: true,
      bookings: {
        where: { status: { in: ["BOOKED", "WAITLISTED", "ATTENDED", "NO_SHOW"] } },
        select: { id: true, userId: true, status: true },
      },
    },
  });

  // Does the member have any usable membership right now?
  const activeMemberships = await prisma.membership.count({
    where: { userId: user.id, status: "ACTIVE", expiresAt: { gt: now } },
  });

  const byDay = groupBy(sessions, (s) => s.startsAt.toDateString());

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Class schedule</h1>
        <p className="text-sm text-ink-500">Book your spot for the next two weeks.</p>
      </div>

      {activeMemberships === 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You don&apos;t have an active membership yet.{" "}
          <a href="/memberships" className="font-semibold underline">
            Choose a plan
          </a>{" "}
          to start booking classes.
        </div>
      )}

      {sessions.length === 0 && (
        <div className="card p-8 text-center text-ink-500">
          No classes are scheduled yet. Check back soon!
        </div>
      )}

      <div className="space-y-8">
        {[...byDay.entries()].map(([day, daySessions]) => (
          <section key={day}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
              {dayLabel(new Date(day))}
            </h2>
            <div className="space-y-3">
              {daySessions.map((s) => {
                const confirmed = s.bookings.filter(
                  (b) => b.status !== "WAITLISTED"
                ).length;
                const spotsLeft = Math.max(0, s.capacity - confirmed);
                const isFull = spotsLeft === 0;
                const mine = s.bookings.find((b) => b.userId === user.id);
                const started = s.startsAt < now;

                return (
                  <div
                    key={s.id}
                    className="card flex items-center gap-4 p-4"
                  >
                    <div
                      className="hidden h-12 w-1.5 rounded-full sm:block"
                      style={{ backgroundColor: s.classType.color }}
                    />
                    <div className="w-16 shrink-0">
                      <div className="font-semibold">{timeLabel(s.startsAt)}</div>
                      <div className="text-xs text-ink-500">
                        {s.classType.duration} min
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">
                        {s.classType.name}
                      </div>
                      <div className="truncate text-sm text-ink-500">
                        {s.instructor.name}
                        {s.room ? ` · ${s.room.name}` : ""}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {mine?.status === "BOOKED" && (
                          <span className="badge bg-green-100 text-green-700">
                            Booked
                          </span>
                        )}
                        {mine?.status === "WAITLISTED" && (
                          <span className="badge bg-amber-100 text-amber-700">
                            Waitlisted
                          </span>
                        )}
                        <span
                          className={`text-xs ${
                            isFull ? "text-red-600" : "text-ink-500"
                          }`}
                        >
                          {isFull ? "Class full" : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`}
                        </span>
                        {s.classType.creditCost !== 1 && (
                          <span className="text-xs text-ink-500">
                            · {s.classType.creditCost} credits
                          </span>
                        )}
                      </div>
                    </div>
                    <BookButton
                      sessionId={s.id}
                      bookingId={mine?.id}
                      myStatus={
                        mine?.status === "BOOKED"
                          ? "BOOKED"
                          : mine?.status === "WAITLISTED"
                          ? "WAITLISTED"
                          : null
                      }
                      isFull={isFull}
                      started={started}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
