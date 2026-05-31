import Link from "next/link";
import { prisma } from "@/lib/db";
import { dayLabel, timeLabel, groupBy } from "@/lib/format";
import { CreateSessionForm } from "@/components/admin/CreateSessionForm";
import { CancelSessionButton } from "@/components/admin/SessionControls";

export const dynamic = "force-dynamic";

export default async function AdminSchedulePage() {
  const now = new Date();

  const [classTypes, instructors, rooms, sessions] = await Promise.all([
    prisma.classType.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.instructor.findMany({ orderBy: { name: "asc" } }),
    prisma.room.findMany({ orderBy: { name: "asc" } }),
    prisma.classSession.findMany({
      where: { startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      include: {
        classType: true,
        instructor: true,
        room: true,
        bookings: {
          where: { status: { in: ["BOOKED", "WAITLISTED", "ATTENDED", "NO_SHOW"] } },
          select: { status: true },
        },
      },
    }),
  ]);

  const byDay = groupBy(sessions, (s) => s.startsAt.toDateString());

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Schedule</h1>
      <p className="mb-6 text-sm text-ink-500">
        Add classes and manage upcoming sessions.
      </p>

      <div className="mb-8">
        <CreateSessionForm
          classTypes={classTypes}
          instructors={instructors}
          rooms={rooms}
        />
      </div>

      <h2 className="mb-3 text-lg font-semibold">Upcoming sessions</h2>
      {sessions.length === 0 && (
        <div className="card p-6 text-center text-ink-500">
          Nothing scheduled yet — add your first class above.
        </div>
      )}

      <div className="space-y-6">
        {[...byDay.entries()].map(([day, list]) => (
          <section key={day}>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">
              {dayLabel(new Date(day))}
            </h3>
            <div className="space-y-2">
              {list.map((s) => {
                const confirmed = s.bookings.filter(
                  (b) => b.status !== "WAITLISTED"
                ).length;
                const waitlisted = s.bookings.filter(
                  (b) => b.status === "WAITLISTED"
                ).length;
                return (
                  <div key={s.id} className="card flex items-center gap-4 p-4">
                    <span
                      className="h-10 w-1.5 rounded-full"
                      style={{ backgroundColor: s.classType.color }}
                    />
                    <div className="w-16 shrink-0">
                      <div className="font-semibold">{timeLabel(s.startsAt)}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{s.classType.name}</div>
                      <div className="text-sm text-ink-500">
                        {s.instructor.name}
                        {s.room ? ` · ${s.room.name}` : ""}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-semibold">
                        {confirmed}/{s.capacity}
                      </div>
                      {waitlisted > 0 && (
                        <div className="text-xs text-amber-600">
                          +{waitlisted} waiting
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Link
                        href={`/admin/schedule/${s.id}`}
                        className="btn-ghost text-xs"
                      >
                        Roster
                      </Link>
                      <CancelSessionButton sessionId={s.id} />
                    </div>
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
