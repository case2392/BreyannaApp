import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { money, dayLabel, timeLabel } from "@/lib/format";
import { MarketingHeader } from "@/components/MarketingHeader";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const user = await getCurrentUser();
  const authed = Boolean(user);
  const dashboardHref = user && isStaff(user.role) ? "/admin" : "/schedule";
  const now = new Date();

  const events = await prisma.event.findMany({
    where: {
      active: true,
      OR: [{ startsAt: null }, { startsAt: { gte: now } }],
    },
    orderBy: [{ startsAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
  });

  return (
    <div className="bg-ink-50">
      <MarketingHeader authed={authed} dashboardHref={dashboardHref} />

      {/* Header */}
      <section className="border-b border-ink-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <p className="eyebrow">Gather with us</p>
          <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">Events</h1>
          <span className="rule mt-5" />
          <p className="mx-auto mt-5 max-w-xl text-ink-600">
            Craft nights, workshops, and special gatherings at Dwell Studio.
            Come create, learn, and grow in community.
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        {events.length === 0 ? (
          <div className="card mx-auto max-w-lg p-10 text-center text-ink-500">
            No events are scheduled right now — check back soon for what&apos;s
            coming up!
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <Link
                key={e.id}
                href={`/events/${e.id}`}
                className="card card-interactive group flex flex-col overflow-hidden"
              >
                <div className="aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-brand-200 via-sage-200 to-clay-200">
                  {e.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={e.imageUrl}
                      alt={e.name}
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="font-brand text-3xl text-brand-700/70">
                        Dwell
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  {e.startsAt && (
                    <div className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                      {dayLabel(e.startsAt)} · {timeLabel(e.startsAt)}
                    </div>
                  )}
                  <h3 className="mt-1 text-lg font-semibold">{e.name}</h3>
                  {e.location && (
                    <p className="mt-0.5 text-sm text-ink-500">{e.location}</p>
                  )}
                  {e.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-ink-600">
                      {e.description}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <span className="font-serif text-lg font-semibold">
                      {e.priceCents === 0 ? "Free" : money(e.priceCents)}
                    </span>
                    <span className="text-sm font-medium text-brand-600 group-hover:underline">
                      View &amp; register →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
