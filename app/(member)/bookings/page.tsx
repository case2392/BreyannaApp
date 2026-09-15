import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { dayLabel, timeLabel } from "@/lib/format";
import { BookButton } from "@/components/BookButton";
import { studioNow } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const user = (await getCurrentUser())!;
  const now = studioNow();

  const [bookings, eventRegs] = await Promise.all([
    prisma.booking.findMany({
      where: { userId: user.id, status: { not: "CANCELLED" } },
      include: {
        session: { include: { classType: true, instructor: true, room: true } },
      },
    }),
    prisma.eventRegistration.findMany({
      where: { userId: user.id },
      include: { event: true },
    }),
  ]);

  type Item =
    | { kind: "class"; id: string; date: Date; booking: (typeof bookings)[number] }
    | {
        kind: "event";
        id: string;
        date: Date | null;
        reg: (typeof eventRegs)[number];
      };

  const items: Item[] = [
    ...bookings.map((b) => ({
      kind: "class" as const,
      id: b.id,
      date: b.session.startsAt,
      booking: b,
    })),
    ...eventRegs.map((r) => ({
      kind: "event" as const,
      id: r.id,
      date: r.event.startsAt,
      reg: r,
    })),
  ];

  const t = (d: Date | null) => (d ? d.getTime() : Infinity);
  // Undated events count as upcoming (date TBD).
  const upcoming = items
    .filter((i) => i.date == null || i.date >= now)
    .sort((a, b) => t(a.date) - t(b.date));
  const past = items
    .filter((i) => i.date != null && i.date < now)
    .sort((a, b) => t(b.date) - t(a.date));

  function ClassUpcoming({ b }: { b: (typeof bookings)[number] }) {
    return (
      <div className="card flex items-center gap-4 p-4">
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
    );
  }

  function EventUpcoming({ r }: { r: (typeof eventRegs)[number] }) {
    return (
      <div className="card flex items-center gap-4 p-4">
        <div className="hidden h-12 w-1.5 rounded-full bg-clay-300 sm:block" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold">
            {r.event.name}{" "}
            <span className="badge ml-1 bg-clay-200 text-clay-500">Event</span>
          </div>
          <div className="text-sm text-ink-500">
            {r.event.startsAt
              ? `${dayLabel(r.event.startsAt)} · ${timeLabel(r.event.startsAt)}`
              : "Date to be announced"}
            {r.event.location ? ` · ${r.event.location}` : ""}
          </div>
          {r.status === "PAID" && (
            <span className="badge mt-1 bg-green-100 text-green-700">Paid</span>
          )}
        </div>
        <Link href={`/events/${r.eventId}`} className="btn-secondary text-xs">
          View
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">My bookings</h1>
      <p className="mb-6 text-sm text-ink-500">
        Your upcoming and past classes and events.
      </p>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
        Upcoming
      </h2>
      {upcoming.length === 0 ? (
        <div className="card mb-8 p-6 text-center text-ink-500">
          Nothing coming up.{" "}
          <a href="/schedule" className="font-semibold text-brand-600">
            Browse the schedule
          </a>
          .
        </div>
      ) : (
        <div className="mb-8 space-y-3">
          {upcoming.map((i) =>
            i.kind === "class" ? (
              <ClassUpcoming key={`c${i.id}`} b={i.booking} />
            ) : (
              <EventUpcoming key={`e${i.id}`} r={i.reg} />
            )
          )}
        </div>
      )}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
        Past
      </h2>
      {past.length === 0 ? (
        <div className="card p-6 text-center text-ink-500">
          No past activity yet.
        </div>
      ) : (
        <div className="space-y-2">
          {past.map((i) => (
            <div
              key={`${i.kind}${i.id}`}
              className="flex items-center justify-between rounded-xl border border-ink-200 bg-white px-4 py-3"
            >
              <div>
                <div className="font-medium">
                  {i.kind === "class"
                    ? i.booking.session.classType.name
                    : i.reg.event.name}
                  {i.kind === "event" && (
                    <span className="badge ml-2 bg-clay-200 text-clay-500">
                      Event
                    </span>
                  )}
                </div>
                <div className="text-xs text-ink-500">
                  {i.date ? `${dayLabel(i.date)} · ${timeLabel(i.date)}` : ""}
                </div>
              </div>
              <span className="badge bg-ink-100 text-ink-700">
                {i.kind === "class"
                  ? i.booking.status === "ATTENDED"
                    ? "Attended"
                    : i.booking.status === "NO_SHOW"
                    ? "No-show"
                    : "Completed"
                  : "Registered"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
