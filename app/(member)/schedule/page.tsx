import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  dayLabel,
  timeLabel,
  groupBy,
  startOfWeek,
  addDays,
  weekdayShort,
  sameDay,
  shortDate,
  capacityLimited,
  money,
} from "@/lib/format";
import { BookButton } from "@/components/BookButton";
import { GuestBookButton } from "@/components/GuestBookButton";
import { availableGuestPasses } from "@/lib/booking";
import { studioNow } from "@/lib/time";

export const dynamic = "force-dynamic";

const MAX_WEEKS_AHEAD = 8;

type SessionWithDetails = Awaited<ReturnType<typeof loadSessions>>[number];
type EventLite = Awaited<ReturnType<typeof loadEvents>>[number];

// Active, dated events in [from, to) that haven't started yet.
async function loadEvents(from: Date, to: Date) {
  const now = new Date();
  const lower = from.getTime() > now.getTime() ? from : now;
  return prisma.event.findMany({
    where: { active: true, startsAt: { gte: lower, lt: to } },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      name: true,
      startsAt: true,
      location: true,
      priceCents: true,
    },
  });
}

// An event shown on the schedule, linking to its detail/registration page.
function EventCard({ e }: { e: EventLite }) {
  return (
    <Link
      href={`/events/${e.id}`}
      className="block rounded-xl border border-clay-300 bg-clay-100/50 p-3 transition hover:border-clay-400"
      style={{ borderLeftWidth: 4, borderLeftColor: "#D2BBA0" }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-bold">
          {e.startsAt ? timeLabel(e.startsAt) : ""}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-clay-500">
          Event
        </span>
      </div>
      <div className="mt-0.5 truncate text-sm font-semibold leading-tight">
        {e.name}
      </div>
      {e.location && (
        <div className="truncate text-xs text-ink-500">{e.location}</div>
      )}
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[11px] text-ink-500">
          {e.priceCents === 0 ? "Free" : money(e.priceCents)}
        </span>
        <span className="text-[11px] font-medium text-brand-600">View →</span>
      </div>
    </Link>
  );
}

// Merge a day's classes and events into one time-sorted list of cards.
function dayItems(
  sessions: SessionWithDetails[],
  events: EventLite[],
  userId: string,
  now: Date,
  compact: boolean,
  guestPasses: number
) {
  const items: { key: string; at: number; node: JSX.Element }[] = [
    ...sessions.map((s) => ({
      key: `c${s.id}`,
      at: s.startsAt.getTime(),
      node: (
        <ClassCard
          s={s}
          userId={userId}
          now={now}
          compact={compact}
          guestPasses={guestPasses}
        />
      ),
    })),
    ...events.map((e) => ({
      key: `e${e.id}`,
      at: e.startsAt ? e.startsAt.getTime() : 0,
      node: <EventCard e={e} />,
    })),
  ];
  items.sort((a, b) => a.at - b.at);
  return items;
}

// `to` is exclusive (sessions strictly before it). Classes stay visible for the
// whole day they fall on (we don't drop them once they've started), and show as
// "Registration closed" only when staff manually close them.
async function loadSessions(from: Date, to: Date) {
  const now = studioNow();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const lower = from > startOfToday ? from : startOfToday;
  return prisma.classSession.findMany({
    where: { cancelled: false, startsAt: { gte: lower, lt: to } },
    orderBy: { startsAt: "asc" },
    include: {
      classType: true,
      instructor: true,
      room: true,
      bookings: {
        where: { status: { in: ["BOOKED", "WAITLISTED", "ATTENDED", "NO_SHOW"] } },
        select: { id: true, userId: true, status: true },
      },
      guestBookings: {
        where: { status: { in: ["BOOKED", "ATTENDED", "NO_SHOW"] } },
        select: { id: true },
      },
    },
  });
}

// Renders a single class as a compact card used in both views.
function ClassCard({
  s,
  userId,
  now,
  guestPasses = 0,
  compact = false,
}: {
  s: SessionWithDetails;
  userId: string;
  now: Date;
  guestPasses?: number;
  compact?: boolean;
}) {
  // Capacity/sold-out only applies to cycle classes; members never see counts.
  const confirmed =
    s.bookings.filter((b) => b.status !== "WAITLISTED").length +
    s.guestBookings.length;
  const isFull = capacityLimited(s.classType.name) && confirmed >= s.capacity;
  const mine = s.bookings.find((b) => b.userId === userId);
  const started = s.startsAt < now;
  // Booking is closed only when staff manually closes it.
  const closed = s.registrationClosed;
  const myStatus =
    mine?.status === "BOOKED"
      ? "BOOKED"
      : mine?.status === "WAITLISTED"
      ? "WAITLISTED"
      : null;

  return (
    <div
      className={`rounded-xl border bg-white p-3 ${
        started ? "opacity-60" : ""
      } ${
        myStatus === "BOOKED"
          ? "border-green-300"
          : myStatus === "WAITLISTED"
          ? "border-amber-300"
          : "border-ink-200"
      }`}
      style={{ borderLeftWidth: 4, borderLeftColor: s.classType.color }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-bold">{timeLabel(s.startsAt)}</span>
        <span className="text-[11px] text-ink-400">{s.classType.duration}m</span>
      </div>
      <div className="mt-0.5 truncate text-sm font-semibold leading-tight">
        {s.classType.name}
      </div>
      <div className="truncate text-xs text-ink-500">{s.instructor.name}</div>

      <div className="mt-1 flex items-center justify-between gap-2">
        <span
          className={`text-[11px] ${isFull ? "text-red-600" : "text-ink-500"}`}
        >
          {myStatus === "BOOKED"
            ? "✓ Booked"
            : myStatus === "WAITLISTED"
            ? "Waitlisted"
            : closed
            ? "Registration closed"
            : isFull
            ? "Sold out"
            : s.classType.free
            ? "Free"
            : ""}
        </span>
        <BookButton
          sessionId={s.id}
          bookingId={mine?.id}
          myStatus={myStatus}
          isFull={isFull}
          started={started}
          closed={closed}
        />
      </div>
      {guestPasses > 0 && !closed && !started && !isFull && (
        <GuestBookButton sessionId={s.id} />
      )}
    </div>
  );
}

function Toggle({
  view,
  weekOffset,
}: {
  view: "week" | "list";
  weekOffset: number;
}) {
  const base =
    "px-3 py-1.5 text-sm font-medium rounded-lg transition";
  return (
    <div className="inline-flex rounded-xl border border-ink-200 bg-white p-1">
      <Link
        href={`/schedule?view=week&w=${weekOffset}`}
        className={`${base} ${
          view === "week" ? "bg-brand-600 text-white" : "text-ink-600"
        }`}
      >
        Week
      </Link>
      <Link
        href="/schedule?view=list"
        className={`${base} ${
          view === "list" ? "bg-brand-600 text-white" : "text-ink-600"
        }`}
      >
        List
      </Link>
    </div>
  );
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: { view?: string; w?: string };
}) {
  const user = (await getCurrentUser())!;
  const now = studioNow();

  const view = searchParams.view === "list" ? "list" : "week";
  let weekOffset = parseInt(searchParams.w ?? "0", 10);
  if (isNaN(weekOffset)) weekOffset = 0;
  weekOffset = Math.max(0, Math.min(MAX_WEEKS_AHEAD, weekOffset));

  const [activeMemberships, pastDueCount] = await Promise.all([
    prisma.membership.findMany({
      where: { userId: user.id, status: "ACTIVE", expiresAt: { gt: now } },
      include: { plan: { select: { guestPassesPerMonth: true } } },
    }),
    prisma.membership.count({
      where: { userId: user.id, status: "PAST_DUE" },
    }),
  ]);
  const guestPasses = availableGuestPasses(activeMemberships);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Class schedule</h1>
          <p className="text-sm text-ink-500">
            Book your spot ·{" "}
            <Link href="/gift" className="font-medium text-brand-600">
              🎁 Gift a class
            </Link>
          </p>
        </div>
        <Toggle view={view} weekOffset={weekOffset} />
      </div>

      {pastDueCount > 0 && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          ⚠️ A payment didn&apos;t go through, so booking is paused.{" "}
          <Link href="/memberships" className="font-semibold underline">
            Update your payment
          </Link>{" "}
          to turn your access back on.
        </div>
      )}

      {activeMemberships.length === 0 && pastDueCount === 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You don&apos;t have an active membership yet.{" "}
          <Link href="/memberships" className="font-semibold underline">
            Choose a plan
          </Link>{" "}
          to start booking classes.
        </div>
      )}

      {guestPasses > 0 && (
        <div className="mb-6 rounded-xl border border-clay-300 bg-clay-100/50 px-4 py-3 text-sm text-ink-700">
          🎟️ You have{" "}
          <b>
            {guestPasses} guest pass{guestPasses === 1 ? "" : "es"}
          </b>{" "}
          available — tap &ldquo;Bring a guest&rdquo; on any class to sign
          someone in.
        </div>
      )}

      {view === "week" ? (
        <WeekView user={user} now={now} weekOffset={weekOffset} guestPasses={guestPasses} />
      ) : (
        <ListView user={user} now={now} guestPasses={guestPasses} />
      )}
    </div>
  );
}

async function WeekView({
  user,
  now,
  weekOffset,
  guestPasses,
}: {
  user: { id: string };
  now: Date;
  weekOffset: number;
  guestPasses: number;
}) {
  const weekStart = startOfWeek(now, weekOffset);
  const weekEnd = addDays(weekStart, 7); // exclusive: next Monday 00:00
  const [sessions, events] = await Promise.all([
    loadSessions(weekStart, weekEnd),
    loadEvents(weekStart, weekEnd),
  ]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const byDay = groupBy(sessions, (s) => s.startsAt.toDateString());
  const eventsByDay = groupBy(events, (e) => e.startsAt!.toDateString());

  return (
    <div>
      {/* Week navigation */}
      <div className="mb-4 flex items-center justify-between">
        {weekOffset > 0 ? (
          <Link href={`/schedule?view=week&w=${weekOffset - 1}`} className="btn-secondary text-sm">
            ← Prev
          </Link>
        ) : (
          <span className="btn-secondary cursor-default text-sm opacity-40">← Prev</span>
        )}
        <div className="text-center text-sm font-semibold">
          {weekOffset === 0 ? "This week · " : ""}
          {shortDate(weekStart)} – {shortDate(addDays(weekEnd, -1))}
        </div>
        {weekOffset < MAX_WEEKS_AHEAD ? (
          <Link href={`/schedule?view=week&w=${weekOffset + 1}`} className="btn-secondary text-sm">
            Next →
          </Link>
        ) : (
          <span className="btn-secondary cursor-default text-sm opacity-40">Next →</span>
        )}
      </div>

      {/* 7-day grid: stacks on mobile, 7 columns on desktop */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-7 sm:gap-2">
        {days.map((day) => {
          const key = day.toDateString();
          const items = dayItems(
            byDay.get(key) ?? [],
            eventsByDay.get(key) ?? [],
            user.id,
            now,
            true,
            guestPasses
          );
          const isToday = sameDay(day, now);
          return (
            <div key={day.toISOString()} className="min-w-0">
              <div
                className={`mb-2 rounded-lg px-2 py-1 text-center text-xs font-semibold ${
                  isToday ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-600"
                }`}
              >
                <div className="uppercase tracking-wide">{weekdayShort(day)}</div>
                <div className="text-base">{day.getDate()}</div>
              </div>
              <div className="space-y-2">
                {items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-ink-200 py-4 text-center text-xs text-ink-300">
                    —
                  </div>
                ) : (
                  items.map((it) => <div key={it.key}>{it.node}</div>)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

async function ListView({
  user,
  now,
  guestPasses,
}: {
  user: { id: string };
  now: Date;
  guestPasses: number;
}) {
  const horizon = addDays(now, 14);
  const [sessions, events] = await Promise.all([
    loadSessions(now, horizon),
    loadEvents(now, horizon),
  ]);
  const byDay = groupBy(sessions, (s) => s.startsAt.toDateString());
  const eventsByDay = groupBy(events, (e) => e.startsAt!.toDateString());

  if (sessions.length === 0 && events.length === 0) {
    return (
      <div className="card p-8 text-center text-ink-500">
        Nothing scheduled yet. Check back soon!
      </div>
    );
  }

  const dayKeys = [
    ...new Set([...byDay.keys(), ...eventsByDay.keys()]),
  ].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  return (
    <div className="space-y-8">
      {dayKeys.map((day) => (
        <section key={day}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
            {dayLabel(new Date(day))}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dayItems(
              byDay.get(day) ?? [],
              eventsByDay.get(day) ?? [],
              user.id,
              now,
              false,
              guestPasses
            ).map((it) => (
              <div key={it.key}>{it.node}</div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
