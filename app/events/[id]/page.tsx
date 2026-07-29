import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { money, dayLabel, timeLabel } from "@/lib/format";
import { finalizeEventCheckout, finalizeEventOrder } from "@/app/actions/events";
import { eventRegStatus } from "@/lib/eventStatus";
import { MarketingHeader } from "@/components/MarketingHeader";
import { EventTicketForm } from "@/components/EventTicketForm";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { status?: string; session_id?: string };
}) {
  // If returning from Stripe, make sure the paid registration(s) are recorded.
  // New purchases go through order-based checkout; the older single-ticket path
  // is still finalized for any in-flight sessions.
  if (searchParams.session_id) {
    const done = await finalizeEventOrder(searchParams.session_id);
    if (!done) await finalizeEventCheckout(searchParams.session_id);
  }

  const user = await getCurrentUser();
  const authed = Boolean(user);
  const dashboardHref = user && isStaff(user.role) ? "/admin" : "/schedule";

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: { _count: { select: { registrations: true } } },
  });
  if (!event || !event.active) notFound();

  const registered = user
    ? Boolean(
        await prisma.eventRegistration.findFirst({
          where: { eventId: event.id, userId: user.id },
        })
      )
    : false;

  const status = eventRegStatus(event, event._count.registrations);
  const priceLabel = event.priceCents === 0 ? "Free" : money(event.priceCents);

  return (
    <div className="bg-ink-50">
      <MarketingHeader authed={authed} dashboardHref={dashboardHref} />

      {searchParams.status === "success" && (
        <div className="border-b border-green-200 bg-green-50 px-4 py-3 text-center text-sm text-green-800">
          You&apos;re registered — see you there! A confirmation is on its way.
        </div>
      )}
      {searchParams.status === "cancel" && (
        <div className="border-b border-ink-200 bg-ink-100 px-4 py-3 text-center text-sm text-ink-700">
          Checkout cancelled — no charge was made.
        </div>
      )}

      <div className="mx-auto max-w-4xl px-4 py-10">
        <Link href="/events" className="text-sm text-brand-600 hover:underline">
          ← All events
        </Link>

        {/* Cover */}
        <div className="mt-4 aspect-[16/9] w-full overflow-hidden rounded-3xl bg-gradient-to-br from-brand-200 via-sage-200 to-clay-200 shadow-soft ring-1 ring-ink-900/5">
          {event.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.imageUrl}
              alt={event.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="font-brand text-5xl text-brand-700/70">Dwell</span>
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-[1fr_20rem]">
          {/* Details */}
          <div>
            <h1 className="text-3xl font-semibold sm:text-4xl">{event.name}</h1>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-600">
              {event.startsAt && (
                <span>
                  🗓 {dayLabel(event.startsAt)} · {timeLabel(event.startsAt)}
                </span>
              )}
              {event.location && <span>📍 {event.location}</span>}
            </div>
            {event.description && (
              <p className="mt-6 whitespace-pre-line leading-relaxed text-ink-700">
                {event.description}
              </p>
            )}
          </div>

          {/* Register card */}
          <div className="md:sticky md:top-24 md:self-start">
            <div className="card p-6">
              <div className="text-center font-serif text-3xl font-semibold">
                {priceLabel}
              </div>
              <div className="mt-4">
                {status === "sold_out" ? (
                  <div className="rounded-full bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-700">
                    Sold out
                  </div>
                ) : status === "closed" ? (
                  <div className="rounded-full bg-ink-100 px-4 py-2 text-center text-sm font-medium text-ink-500">
                    Registration closed
                  </div>
                ) : (
                  <EventTicketForm
                    eventId={event.id}
                    priceCents={event.priceCents}
                    priceLabel={priceLabel}
                    authed={authed}
                    selfRegistered={registered}
                    me={
                      user
                        ? {
                            firstName: user.firstName,
                            lastName: user.lastName,
                            email: user.email,
                          }
                        : null
                    }
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
