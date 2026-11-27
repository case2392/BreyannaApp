import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { finalizeCheckoutSession } from "@/lib/membership";
import { money } from "@/lib/format";
import { activeSale } from "@/lib/sale";
import { studioNow } from "@/lib/time";
import {
  getSaunaSettings,
  saunaAvailability,
  saunaMemberships,
  upcomingSaunaBookings,
} from "@/lib/sauna";
import { clockLabel, dayKey, dayLabelLong, rangeLabel } from "@/lib/saunaShared";
import { SaunaBooker, type SaunaDay } from "@/components/SaunaBooker";
import { SaunaCancelButton } from "@/components/SaunaCancelButton";

export const dynamic = "force-dynamic";

export default async function SaunaPage({
  searchParams,
}: {
  searchParams: { slot?: string; status?: string; session_id?: string };
}) {
  const user = (await getCurrentUser())!;
  // Back from paying for a sauna plan: make sure it's active right away.
  if (searchParams.session_id) {
    await finalizeCheckoutSession(user.id, searchParams.session_id);
  }

  const s = await getSaunaSettings();
  const staff = isStaff(user.role);
  if (!s.enabled && !staff) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <div className="text-4xl" aria-hidden="true">
          🧖‍♀️
        </div>
        <h1 className="mt-3 text-2xl font-semibold">{s.name}</h1>
        <p className="mt-2 text-sm text-ink-600">
          Sauna booking is opening soon — check back shortly!
        </p>
      </div>
    );
  }

  const now = studioNow();
  const [access, upcoming, plans, availability, me] = await Promise.all([
    saunaMemberships(user.id),
    upcomingSaunaBookings(user.id),
    prisma.membershipPlan.findMany({
      where: { active: true, category: "SAUNA" },
      orderBy: { priceCents: "asc" },
    }),
    saunaAvailability(s, user.id),
    prisma.user.findUnique({ where: { id: user.id }, select: { saunaWaiverAt: true } }),
  ]);

  const today = dayKey(now);
  const tomorrow = dayKey(new Date(now.getTime() + 24 * 3600e3));
  const days: SaunaDay[] = availability.map(({ day, slots }) => {
    const d = new Date(`${day}T00:00:00Z`);
    return {
      day,
      weekday: d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      relative: day === today ? "Today" : day === tomorrow ? "Tomorrow" : null,
      slots: slots.map((x) => ({
        start: x.start.toISOString(),
        label: clockLabel(x.start),
        range: rangeLabel(x.start, x.end),
        status: x.status,
      })),
    };
  });

  const order: Record<string, number> = { DROP_IN: 0, PACK: 1, UNLIMITED: 2 };
  const planOptions = plans
    .sort((a, b) => (order[a.kind] ?? 9) - (order[b.kind] ?? 9))
    .map((p) => {
      const sale = activeSale(p);
      const price = sale?.saleCents ?? p.priceCents;
      return {
        id: p.id,
        name: p.name,
        kind: p.kind,
        fullCents: p.priceCents,
        saleCents: sale?.saleCents ?? null,
        note:
          p.kind === "UNLIMITED"
            ? "Unlimited sessions · renews monthly"
            : p.credits > 1
            ? `${p.credits} sessions · ${money(Math.round(price / p.credits))} each`
            : "One session",
      };
    });

  const MIN = 60 * 1000;
  const hasAccess = Boolean(access.unlimited) || access.credits > 0;

  return (
    <div>
      {!s.enabled && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Preview — members can&apos;t see this page until you turn on sauna booking in{" "}
          <Link href="/admin/sauna" className="font-semibold underline">
            CRM → Sauna
          </Link>
          .
        </div>
      )}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{s.name}</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-600">{s.description}</p>
        <p className="mt-1 text-xs text-ink-500">
          {s.sessionMinutes}-minute private sessions
          {s.maxPeople > 1 ? ` · up to ${s.maxPeople} people` : ""}
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {/* Access */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
            Your sauna access
          </h2>
          {hasAccess ? (
            <div className="mt-2 space-y-1">
              {access.unlimited && (
                <p className="text-lg font-semibold text-brand-700">
                  ∞ {access.unlimited.plan.name}
                </p>
              )}
              {access.credits > 0 && (
                <p className={access.unlimited ? "text-sm text-ink-600" : "text-lg font-semibold text-brand-700"}>
                  {access.credits} session{access.credits === 1 ? "" : "s"} left
                </p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-ink-600">
              No sauna plan yet — pick a time below and you can choose a single
              session, a pack or unlimited right there.
            </p>
          )}
          <Link href="/memberships" className="mt-3 inline-block text-xs font-medium text-brand-600">
            See all plans →
          </Link>
        </div>

        {/* Upcoming */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
            Your upcoming sessions
          </h2>
          {upcoming.length === 0 ? (
            <p className="mt-2 text-sm text-ink-500">Nothing booked yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-ink-100">
              {upcoming.map((b) => {
                const late = b.startsAt.getTime() - now.getTime() < s.cancelHours * 60 * MIN;
                const started = b.startsAt.getTime() <= now.getTime();
                return (
                  <li key={b.id} className="flex items-center justify-between gap-3 py-2">
                    <div>
                      <div className="text-sm font-semibold">{dayLabelLong(b.startsAt)}</div>
                      <div className="text-xs text-ink-500">
                        {rangeLabel(b.startsAt, b.endsAt)}
                        {b.people > 1 ? ` · ${b.people} people` : ""}
                      </div>
                    </div>
                    {started ? (
                      <span className="badge bg-green-100 text-green-700">Now</span>
                    ) : (
                      <SaunaCancelButton id={b.id} late={late} usesSession={b.creditsUsed > 0} />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <SaunaBooker
        days={days}
        access={{
          unlimitedName: access.unlimited?.plan.name ?? null,
          credits: access.credits,
        }}
        plans={planOptions}
        needsGuidelines={!me?.saunaWaiverAt}
        guidelines={s.guidelines}
        maxPeople={s.maxPeople}
        cancelHours={s.cancelHours}
        initialSlot={searchParams.slot ?? null}
        justPurchased={searchParams.status === "success"}
      />
    </div>
  );
}
