import { prisma } from "@/lib/db";
import { money, dayLabel, timeLabel } from "@/lib/format";
import { CreateEventForm, EventRow } from "@/components/admin/EventForms";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const events = await prisma.event.findMany({
    orderBy: [{ startsAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    include: { _count: { select: { registrations: true } } },
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Events</h1>
      <p className="mb-6 text-sm text-ink-500">
        Craft nights, workshops, markets — build each one from scratch with its
        own details, location, and price.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-semibold">Your events</h2>
          {events.length === 0 ? (
            <div className="card p-6 text-center text-sm text-ink-500">
              No events yet — create your first one on the right.
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((e) => (
                <EventRow
                  key={e.id}
                  event={{
                    id: e.id,
                    name: e.name,
                    description: e.description,
                    location: e.location,
                    priceCents: e.priceCents,
                    active: e.active,
                    whenLabel: e.startsAt
                      ? `${dayLabel(e.startsAt)} · ${timeLabel(e.startsAt)}`
                      : "No date set",
                    priceLabel: e.priceCents === 0 ? "Free" : money(e.priceCents),
                    date: e.startsAt ? e.startsAt.toISOString().slice(0, 10) : "",
                    time: e.startsAt ? e.startsAt.toISOString().slice(11, 16) : "",
                    price: String(e.priceCents / 100),
                    capacity: e.capacity != null ? String(e.capacity) : "",
                    capacityNum: e.capacity,
                    imageUrl: e.imageUrl,
                    registrationCount: e._count.registrations,
                    registrationClosed: e.registrationClosed,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <CreateEventForm />
        </div>
      </div>
    </div>
  );
}
