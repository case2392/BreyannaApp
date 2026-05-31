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
} from "@/lib/format";
import { BookButton } from "@/components/BookButton";

export const dynamic = "force-dynamic";

const MAX_WEEKS_AHEAD = 8;

type SessionWithDetails = Awaited<ReturnType<typeof loadSessions>>[number];

// `to` is exclusive (sessions strictly before it).
async function loadSessions(from: Date, to: Date) {
  return prisma.classSession.findMany({
    where: { cancelled: false, startsAt: { gte: from, lt: to } },
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
}

// Renders a single class as a compact card used in both views.
function ClassCard({
  s,
  userId,
  now,
  compact = false,
}: {
  s: SessionWithDetails;
  userId: string;
  now: Date;
  compact?: boolean;
}) {
  const confirmed = s.bookings.filter((b) => b.status !== "WAITLISTED").length;
  const spotsLeft = Math.max(0, s.capacity - confirmed);
  const isFull = spotsLeft === 0;
  const mine = s.bookings.find((b) => b.userId === userId);
  const started = s.startsAt < now;
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
            : isFull
            ? "Full"
            : `${spotsLeft} left`}
        </span>
        <BookButton
          sessionId={s.id}
          bookingId={mine?.id}
          myStatus={myStatus}
          isFull={isFull}
          started={started}
        />
      </div>
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
  const now = new Date();

  const view = searchParams.view === "list" ? "list" : "week";
  let weekOffset = parseInt(searchParams.w ?? "0", 10);
  if (isNaN(weekOffset)) weekOffset = 0;
  weekOffset = Math.max(0, Math.min(MAX_WEEKS_AHEAD, weekOffset));

  const activeMemberships = await prisma.membership.count({
    where: { userId: user.id, status: "ACTIVE", expiresAt: { gt: now } },
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Class schedule</h1>
          <p className="text-sm text-ink-500">Book your spot.</p>
        </div>
        <Toggle view={view} weekOffset={weekOffset} />
      </div>

      {activeMemberships === 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You don&apos;t have an active membership yet.{" "}
          <Link href="/memberships" className="font-semibold underline">
            Choose a plan
          </Link>{" "}
          to start booking classes.
        </div>
      )}

      {view === "week" ? (
        <WeekView user={user} now={now} weekOffset={weekOffset} />
      ) : (
        <ListView user={user} now={now} />
      )}
    </div>
  );
}

async function WeekView({
  user,
  now,
  weekOffset,
}: {
  user: { id: string };
  now: Date;
  weekOffset: number;
}) {
  const weekStart = startOfWeek(now, weekOffset);
  const weekEnd = addDays(weekStart, 7); // exclusive: next Monday 00:00
  const sessions = await loadSessions(weekStart, weekEnd);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const byDay = groupBy(sessions, (s) => s.startsAt.toDateString());

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
          const daySessions = byDay.get(day.toDateString()) ?? [];
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
                {daySessions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-ink-200 py-4 text-center text-xs text-ink-300">
                    —
                  </div>
                ) : (
                  daySessions.map((s) => (
                    <ClassCard key={s.id} s={s} userId={user.id} now={now} compact />
                  ))
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
}: {
  user: { id: string };
  now: Date;
}) {
  const horizon = addDays(now, 14);
  const sessions = await loadSessions(now, horizon);
  const byDay = groupBy(sessions, (s) => s.startsAt.toDateString());

  if (sessions.length === 0) {
    return (
      <div className="card p-8 text-center text-ink-500">
        No classes are scheduled yet. Check back soon!
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {[...byDay.entries()].map(([day, daySessions]) => (
        <section key={day}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
            {dayLabel(new Date(day))}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {daySessions.map((s) => (
              <ClassCard key={s.id} s={s} userId={user.id} now={now} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
