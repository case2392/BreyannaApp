import Link from "next/link";
import { prisma } from "@/lib/db";
import { studioNow } from "@/lib/time";
import { getSaunaSettings, saunaAvailability } from "@/lib/sauna";
import { bookableDays, clockLabel, dayKey, dayLabelLong, rangeLabel } from "@/lib/saunaShared";
import {
  DeleteBlockButton,
  SaunaBlockForm,
  SaunaBookingActions,
  SaunaSettingsForm,
  SaunaStaffBookForm,
} from "@/components/admin/SaunaAdmin";

export const dynamic = "force-dynamic";

export default async function AdminSaunaPage() {
  const s = await getSaunaSettings();
  const now = studioNow();
  const todayStart = new Date(`${dayKey(now)}T00:00:00Z`);
  const horizon = new Date(todayStart.getTime() + Math.max(s.bookAheadDays, 14) * 24 * 3600e3);
  const weekAgo = new Date(todayStart.getTime() - 7 * 24 * 3600e3);

  const [bookings, blocks, saunaPlans, members, saunaMemberships, availability] =
    await Promise.all([
      prisma.saunaBooking.findMany({
        where: { startsAt: { gte: weekAgo, lt: horizon }, status: { not: "CANCELLED" } },
        orderBy: { startsAt: "asc" },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, phone: true } },
          membership: { include: { plan: { select: { name: true } } } },
        },
      }),
      prisma.saunaBlock.findMany({
        where: { endsAt: { gt: now } },
        orderBy: { startsAt: "asc" },
      }),
      prisma.membershipPlan.findMany({
        where: { category: "SAUNA" },
        select: { id: true, active: true },
      }),
      prisma.user.findMany({
        where: { role: "MEMBER" },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        select: { id: true, firstName: true, lastName: true },
      }),
      prisma.membership.findMany({
        where: {
          status: "ACTIVE",
          expiresAt: { gt: new Date() },
          plan: { category: "SAUNA" },
        },
        select: { userId: true, creditsRemaining: true, plan: { select: { kind: true } } },
      }),
      saunaAvailability(s, undefined, {
        ignoreNotice: true,
        days: bookableDays(now, { ...s, bookAheadDays: Math.max(s.bookAheadDays, 14) }),
      }),
    ]);

  const credits = new Map<string, { credits: number; unlimited: boolean }>();
  for (const m of saunaMemberships) {
    const c = credits.get(m.userId) ?? { credits: 0, unlimited: false };
    if (m.plan.kind === "UNLIMITED") c.unlimited = true;
    else c.credits += m.creditsRemaining;
    credits.set(m.userId, c);
  }

  // Bookings grouped by day; upcoming first, then the last week.
  const upcoming = bookings.filter((b) => b.endsAt.getTime() > now.getTime());
  const recent = bookings
    .filter((b) => b.endsAt.getTime() <= now.getTime())
    .reverse();
  const byDay = new Map<string, typeof upcoming>();
  for (const b of upcoming) {
    const k = dayKey(b.startsAt);
    byDay.set(k, [...(byDay.get(k) ?? []), b]);
  }

  const activePlans = saunaPlans.filter((p) => p.active).length;
  const steps = [
    { done: activePlans > 0, text: "Create sauna plans (single session, pack, unlimited)", href: "/admin/plans" },
    { done: true, text: "Set your sauna hours and session length (below)" },
    { done: s.enabled, text: "Turn on sauna booking (below)" },
  ];

  function Row({ b }: { b: (typeof bookings)[number] }) {
    const past = b.startsAt.getTime() <= now.getTime();
    return (
      <li className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
        <span className="w-36 text-sm font-semibold">{rangeLabel(b.startsAt, b.endsAt)}</span>
        <span className="min-w-0 flex-1">
          <Link href={`/admin/members/${b.user.id}`} className="font-medium hover:text-brand-600">
            {b.user.firstName} {b.user.lastName}
          </Link>
          <span className="block text-xs text-ink-500">
            {b.people > 1 ? `${b.people} people${b.guestNames ? ` (${b.guestNames})` : ""} · ` : ""}
            {b.membership
              ? `${b.membership.plan.name}${b.creditsUsed > 0 ? ` · ${b.creditsUsed} session${b.creditsUsed === 1 ? "" : "s"}` : ""}`
              : "Complimentary"}
            {b.bookedBy === "STAFF" ? " · booked by staff" : ""}
          </span>
        </span>
        <SaunaBookingActions
          id={b.id}
          status={b.status}
          past={past}
          usesSession={b.creditsUsed > 0}
        />
      </li>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Sauna</h1>
          <p className="text-sm text-ink-500">
            Bookings for the {s.name} · {s.sessionMinutes}-min sessions with{" "}
            {s.bufferMinutes} min between
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`badge ${s.enabled ? "bg-green-100 text-green-700" : "bg-ink-100 text-ink-600"}`}
          >
            {s.enabled ? "Booking is on" : "Booking is off"}
          </span>
          <Link href="/sauna" className="btn-secondary text-sm">
            Member view →
          </Link>
        </div>
      </div>

      {steps.some((x) => !x.done) && (
        <div className="card mb-6 border-brand-200 p-5">
          <h2 className="font-semibold">Get the sauna ready for booking</h2>
          <ol className="mt-3 space-y-2">
            {steps.map((x, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                    x.done ? "bg-green-100 text-green-700" : "bg-ink-100 text-ink-500"
                  }`}
                  aria-hidden="true"
                >
                  {x.done ? "✓" : i + 1}
                </span>
                <span className={x.done ? "text-ink-500 line-through" : "text-ink-800"}>
                  {x.text}
                </span>
                {!x.done && x.href && (
                  <Link href={x.href} className="text-xs font-medium text-brand-600">
                    Go →
                  </Link>
                )}
              </li>
            ))}
          </ol>
          {activePlans === 0 && (
            <p className="mt-3 text-xs text-ink-500">
              In Plans, click “New plan” and choose <b>Sauna</b> under “What is this
              plan for?”. Sales, Stripe checkout and gifting work just like class plans.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5">
            <h2 className="mb-2 font-semibold">Upcoming sessions</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-ink-500">No sauna sessions booked yet.</p>
            ) : (
              [...byDay.entries()].map(([day, list]) => (
                <div key={day} className="mt-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    {day === dayKey(now) ? "Today" : dayLabelLong(new Date(`${day}T00:00:00Z`))}
                  </h3>
                  <ul className="divide-y divide-ink-100">
                    {list.map((b) => (
                      <Row key={b.id} b={b} />
                    ))}
                  </ul>
                </div>
              ))
            )}
          </section>

          {recent.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-1 font-semibold">Past week</h2>
              <p className="text-xs text-ink-500">Mark who came and who didn&apos;t.</p>
              <ul className="mt-2 divide-y divide-ink-100">
                {recent.map((b) => (
                  <li key={b.id}>
                    <div className="pt-2 text-xs text-ink-500">{dayLabelLong(b.startsAt)}</div>
                    <ul>
                      <Row b={b} />
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card p-5">
            <h2 className="mb-4 font-semibold">Sauna settings</h2>
            <SaunaSettingsForm settings={s} />
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-1 font-semibold">Book for a member</h2>
            <p className="mb-3 text-xs text-ink-500">
              Uses their sauna sessions unless you mark it complimentary.
            </p>
            <SaunaStaffBookForm
              maxPeople={s.maxPeople}
              members={members.map((m) => ({
                id: m.id,
                name: `${m.firstName} ${m.lastName}`,
                credits: credits.get(m.id)?.credits ?? 0,
                unlimited: credits.get(m.id)?.unlimited ?? false,
              }))}
              days={availability
                .filter((d) => d.slots.length > 0)
                .map((d) => ({
                  day: d.day,
                  label: new Date(`${d.day}T00:00:00Z`).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  }),
                  slots: d.slots
                    .filter((x) => x.status !== "past")
                    .map((x) => ({
                      start: x.start.toISOString(),
                      label: clockLabel(x.start),
                      open: x.status === "open",
                    })),
                }))}
            />
          </section>

          <section className="card p-5">
            <h2 className="mb-1 font-semibold">Block off time</h2>
            <p className="mb-3 text-xs text-ink-500">
              Maintenance, holidays or private events — members can&apos;t book these times.
            </p>
            <SaunaBlockForm />
            {blocks.length > 0 && (
              <ul className="mt-4 divide-y divide-ink-100 border-t border-ink-100">
                {blocks.map((b) => {
                  const allDay =
                    b.startsAt.getUTCHours() === 0 &&
                    b.startsAt.getUTCMinutes() === 0 &&
                    b.endsAt.getTime() - b.startsAt.getTime() === 24 * 3600e3;
                  return (
                    <li key={b.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                      <span>
                        <span className="font-medium">{dayLabelLong(b.startsAt)}</span>
                        <span className="block text-xs text-ink-500">
                          {allDay ? "All day" : rangeLabel(b.startsAt, b.endsAt)}
                          {b.reason ? ` · ${b.reason}` : ""}
                        </span>
                      </span>
                      <DeleteBlockButton id={b.id} />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
