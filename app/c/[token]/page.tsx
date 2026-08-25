import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { dayLabel, timeLabel, capacityLimited } from "@/lib/format";
import { studioNow } from "@/lib/time";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { ReservePrivateButton } from "@/components/ReservePrivateButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "You're invited · Dwell Studio" };

export default async function PrivateClassPage({
  params,
}: {
  params: { token: string };
}) {
  const session = await prisma.classSession.findUnique({
    where: { inviteToken: params.token },
    include: {
      classType: true,
      instructor: true,
      room: true,
      bookings: {
        where: { status: { in: ["BOOKED", "ATTENDED", "NO_SHOW"] } },
        select: { userId: true },
      },
      guestBookings: {
        where: { status: { in: ["BOOKED", "ATTENDED", "NO_SHOW"] } },
        select: { id: true },
      },
    },
  });
  if (!session) notFound();

  const user = await getCurrentUser();
  const authed = Boolean(user);
  const dashboardHref = user && isStaff(user.role) ? "/admin" : "/schedule";

  const mineBooked = user
    ? session.bookings.some((b) => b.userId === user.id)
    : false;
  const taken = session.bookings.length + session.guestBookings.length;
  const isFull =
    capacityLimited(session.classType.name) && taken >= session.capacity;
  const started = session.startsAt.getTime() < studioNow().getTime();
  const unavailable = session.cancelled || session.registrationClosed;

  return (
    <div className="bg-ink-50">
      <MarketingHeader authed={authed} dashboardHref={dashboardHref} />
      <main id="main-content" className="mx-auto max-w-lg px-4 py-12">
        <p className="eyebrow text-center">You&apos;re invited</p>
        <div className="card mt-4 p-6 text-center">
          <div
            className="mx-auto mb-4 h-1.5 w-16 rounded-full"
            style={{ backgroundColor: session.classType.color }}
          />
          <h1 className="text-2xl font-semibold">{session.classType.name}</h1>
          <p className="mt-2 text-ink-600">
            {dayLabel(session.startsAt)} · {timeLabel(session.startsAt)}
          </p>
          <p className="text-sm text-ink-500">
            with {session.instructor.name}
            {session.room ? ` · ${session.room.name}` : ""}
          </p>
          {session.classType.description && (
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-700">
              {session.classType.description}
            </p>
          )}

          <div className="mt-6">
            {session.cancelled ? (
              <div className="rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-700">
                This class was cancelled.
              </div>
            ) : mineBooked ? (
              <div className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
                ✓ You&apos;re reserved — see you there!
              </div>
            ) : started ? (
              <div className="rounded-full bg-ink-100 px-4 py-2 text-sm font-medium text-ink-500">
                This class has already started.
              </div>
            ) : unavailable ? (
              <div className="rounded-full bg-ink-100 px-4 py-2 text-sm font-medium text-ink-500">
                Reservations are closed for this class.
              </div>
            ) : isFull ? (
              <div className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">
                This class is full.
              </div>
            ) : !authed ? (
              <div>
                <Link
                  href={`/login?next=/c/${params.token}`}
                  className="btn-primary block w-full"
                >
                  Sign in to reserve
                </Link>
                <p className="mt-3 text-xs text-ink-500">
                  New here?{" "}
                  <Link
                    href={`/register?next=/c/${params.token}`}
                    className="font-semibold text-brand-600"
                  >
                    Create an account
                  </Link>
                  , then reserve.
                </p>
              </div>
            ) : (
              <ReservePrivateButton token={params.token} />
            )}
          </div>

          <p className="mt-4 text-xs text-ink-400">
            This is a private, invite-only class. Please don&apos;t share the
            link.
          </p>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
