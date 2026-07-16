import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { dayLabel, timeLabel, capacityLimited } from "@/lib/format";
import {
  AttendanceControls,
  RegistrationToggle,
} from "@/components/admin/SessionControls";
import { AddToClassForm } from "@/components/admin/AddToClassForm";

export const dynamic = "force-dynamic";

export default async function RosterPage({
  params,
}: {
  params: { id: string };
}) {
  const [session, members] = await Promise.all([
    prisma.classSession.findUnique({
      where: { id: params.id },
      include: {
        classType: true,
        instructor: true,
        room: true,
        bookings: {
          where: { status: { not: "CANCELLED" } },
          include: { user: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: "MEMBER" },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  if (!session) notFound();

  // Members not already on this class's list.
  const bookedIds = new Set(session.bookings.map((b) => b.userId));
  const addable = members
    .filter((m) => !bookedIds.has(m.id))
    .map((m) => ({ id: m.id, name: `${m.firstName} ${m.lastName}` }));

  const confirmed = session.bookings.filter((b) => b.status !== "WAITLISTED");
  const waitlist = session.bookings.filter((b) => b.status === "WAITLISTED");

  return (
    <div>
      <Link href="/admin/schedule" className="text-sm text-brand-600">
        ← Back to schedule
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{session.classType.name}</h1>
      <p className="mb-6 text-sm text-ink-500">
        {dayLabel(session.startsAt)} · {timeLabel(session.startsAt)} ·{" "}
        {session.instructor.name}
        {session.room ? ` · ${session.room.name}` : ""}
        {session.cancelled && (
          <span className="badge ml-2 bg-red-100 text-red-700">Cancelled</span>
        )}
      </p>

      {!session.cancelled && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <RegistrationToggle
            sessionId={session.id}
            closed={session.registrationClosed}
          />
          {session.registrationClosed ? (
            <span className="text-sm text-red-600">
              Booking is closed — members can&apos;t sign up (you still can below).
            </span>
          ) : (
            <span className="text-sm text-ink-500">
              Booking is open.
            </span>
          )}
        </div>
      )}

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">
            Roster (
            {capacityLimited(session.classType.name)
              ? `${confirmed.length}/${session.capacity}`
              : `${confirmed.length} booked`}
            )
          </h2>
        </div>
        {confirmed.length === 0 ? (
          <p className="text-sm text-ink-500">No-one booked yet.</p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {confirmed.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <div className="font-medium">
                    {b.user.firstName} {b.user.lastName}
                  </div>
                  <div className="text-xs text-ink-500">{b.user.email}</div>
                </div>
                <AttendanceControls bookingId={b.id} status={b.status} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {waitlist.length > 0 && (
        <div className="card mt-4 p-5">
          <h2 className="mb-3 font-semibold">Waitlist ({waitlist.length})</h2>
          <ol className="list-inside list-decimal space-y-2 text-sm">
            {waitlist.map((b) => (
              <li key={b.id}>
                {b.user.firstName} {b.user.lastName}{" "}
                <span className="text-ink-500">— {b.user.email}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {!session.cancelled && (
        <div className="mt-4">
          <AddToClassForm sessionId={session.id} members={addable} />
        </div>
      )}
    </div>
  );
}
