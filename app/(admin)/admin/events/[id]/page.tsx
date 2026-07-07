import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { money, dayLabel, timeLabel, shortDate } from "@/lib/format";
import { RemoveRegistrationButton } from "@/components/admin/RemoveRegistrationButton";

export const dynamic = "force-dynamic";

export default async function EventRosterPage({
  params,
}: {
  params: { id: string };
}) {
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: { registrations: { orderBy: { createdAt: "asc" } } },
  });
  if (!event) notFound();

  const paidTotal = event.registrations.reduce((s, r) => s + r.amountCents, 0);

  return (
    <div>
      <Link href="/admin/events" className="text-sm text-brand-600">
        ← Back to events
      </Link>

      <div className="mt-3 flex flex-wrap items-start gap-4">
        {event.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.imageUrl}
            alt={event.name}
            className="h-24 w-36 shrink-0 rounded-xl object-cover shadow-soft"
          />
        )}
        <div>
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {event.startsAt
              ? `${dayLabel(event.startsAt)} · ${timeLabel(event.startsAt)}`
              : "No date set"}
            {event.location ? ` · ${event.location}` : ""} ·{" "}
            {event.priceCents === 0 ? "Free" : money(event.priceCents)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <div className="text-xs text-ink-500">Registered</div>
          <div className="text-2xl font-bold">{event.registrations.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ink-500">Paid</div>
          <div className="text-2xl font-bold">
            {event.registrations.filter((r) => r.status === "PAID").length}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ink-500">Collected</div>
          <div className="text-2xl font-bold">{money(paidTotal)}</div>
        </div>
      </div>

      <h2 className="mb-3 mt-8 font-semibold">Roster</h2>
      {event.registrations.length === 0 ? (
        <div className="card p-6 text-center text-sm text-ink-500">
          No registrations yet.
        </div>
      ) : (
        <div className="card divide-y divide-ink-100">
          {event.registrations.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="font-medium">{r.name}</div>
                <div className="truncate text-xs text-ink-500">{r.email}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-ink-400">
                  {shortDate(r.createdAt)}
                </span>
                {r.status === "PAID" ? (
                  <span className="badge bg-green-100 text-green-700">
                    Paid {money(r.amountCents)}
                  </span>
                ) : (
                  <span className="badge bg-ink-100 text-ink-600">
                    Registered
                  </span>
                )}
                <RemoveRegistrationButton id={r.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
