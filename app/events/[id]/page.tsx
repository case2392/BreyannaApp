import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { money, dayLabel, timeLabel } from "@/lib/format";
import { finalizeEventCheckout } from "@/app/actions/events";
import { MarketingHeader } from "@/components/MarketingHeader";
import { EventRegisterButton } from "@/components/EventRegisterButton";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { status?: string; session_id?: string };
}) {
  // If returning from Stripe, make sure the paid registration is recorded.
  if (searchParams.session_id) {
    await finalizeEventCheckout(searchParams.session_id);
  }

  const user = await getCurrentUser();
  const authed = Boolean(user);
  const dashboardHref = user && isStaff(user.role) ? "/admin" : "/schedule";

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event || !event.active) notFound();

  const registered = user
    ? Boolean(
        await prisma.eventRegistration.findFirst({
          where: { eventId: event.id, userId: user.id },
        })
      )
    : false;

  const past = event.startsAt ? event.startsAt.getTime() < Date.now() : false;
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
            <div className="card p-6 text-center">
              <div className="font-serif text-3xl font-semibold">{priceLabel}</div>
              <div className="mt-4">
                {past ? (
                  <div className="rounded-full bg-ink-100 px-4 py-2 text-sm font-medium text-ink-500">
                    This event has passed
                  </div>
                ) : registered ? (
                  <div className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
                    ✓ You&apos;re registered
                  </div>
                ) : (
                  <EventRegisterButton
                    eventId={event.id}
                    priceLabel={priceLabel}
                    authed={authed}
                  />
                )}
              </div>
              {!authed && !past && (
                <p className="mt-3 text-xs text-ink-500">
                  You&apos;ll sign in to complete your registration.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
