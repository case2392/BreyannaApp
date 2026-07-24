import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { dayLabel, timeLabel, capacityLimited } from "@/lib/format";
import {
  AttendanceControls,
  RegistrationToggle,
} from "@/components/admin/SessionControls";
import { AddToClassForm } from "@/components/admin/AddToClassForm";
import { GuestCancelButton } from "@/components/admin/GuestCancelButton";
import { EditSessionForm } from "@/components/admin/EditSessionForm";
import { SessionNotes } from "@/components/admin/SessionNotes";

export const dynamic = "force-dynamic";

export default async function RosterPage({
  params,
}: {
  params: { id: string };
}) {
  const [session, members, classTypes, instructors] = await Promise.all([
    prisma.classSession.findUnique({
      where: { id: params.id },
      include: {
        classType: true,
        instructor: true,
        room: true,
        bookings: {
          include: { user: true },
          orderBy: { createdAt: "asc" },
        },
        guestBookings: {
          include: { host: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: "MEMBER" },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.classType.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.instructor.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!session) notFound();

  // Anyone with a live (non-cancelled) booking can't be added again.
  const activeBookings = session.bookings.filter((b) => b.status !== "CANCELLED");
  const bookedIds = new Set(activeBookings.map((b) => b.userId));
  const addable = members
    .filter((m) => !bookedIds.has(m.id))
    .map((m) => ({ id: m.id, name: `${m.firstName} ${m.lastName}` }));

  const confirmed = activeBookings.filter((b) => b.status !== "WAITLISTED");
  const waitlist = activeBookings.filter((b) => b.status === "WAITLISTED");
  const cancelled = session.bookings.filter((b) => b.status === "CANCELLED");
  const cancelledGuests = session.guestBookings.filter(
    (g) => g.status === "CANCELLED"
  );
  const activeGuests = session.guestBookings.filter(
    (g) => g.status !== "CANCELLED"
  );

  // Naive wall-clock date/time strings for the edit form (match how times are
  // stored — see lib/time.ts).
  const iso = session.startsAt.toISOString();
  const editCurrent = {
    classTypeId: session.classTypeId,
    instructorId: session.instructorId,
    roomName: session.room?.name ?? "",
    date: iso.slice(0, 10),
    time: iso.slice(11, 16),
    capacity: session.capacity,
  };

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
        <div className="mb-6 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <RegistrationToggle
              sessionId={session.id}
              closed={session.registrationClosed}
            />
            {session.registrationClosed ? (
              <span className="text-sm text-red-600">
                Booking is closed — members can&apos;t sign up (you still can below).
              </span>
            ) : (
              <span className="text-sm text-ink-500">Booking is open.</span>
            )}
          </div>
          <EditSessionForm
            sessionId={session.id}
            classTypes={classTypes}
            instructors={instructors}
            current={editCurrent}
          />
        </div>
      )}

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">
            Roster (
            {capacityLimited(session.classType.name)
              ? `${confirmed.length + activeGuests.length}/${session.capacity}`
              : `${confirmed.length + activeGuests.length} booked`}
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

      {activeGuests.length > 0 && (
        <div className="card mt-4 p-5">
          <h2 className="mb-3 font-semibold">
            Guests ({activeGuests.length})
          </h2>
          <ul className="divide-y divide-ink-100">
            {activeGuests.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <div className="font-medium">
                    {g.firstName} {g.lastName}{" "}
                    <span className="badge ml-1 bg-clay-200 text-clay-500">
                      Guest
                    </span>
                  </div>
                  <div className="text-xs text-ink-500">
                    {g.phone}
                    {g.email ? ` · ${g.email}` : ""} · guest of{" "}
                    {g.host.firstName} {g.host.lastName}
                  </div>
                </div>
                <GuestCancelButton id={g.id} />
              </li>
            ))}
          </ul>
        </div>
      )}

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

      {(cancelled.length > 0 || cancelledGuests.length > 0) && (
        <div className="card mt-4 p-5">
          <h2 className="mb-1 font-semibold">
            Cancelled ({cancelled.length + cancelledGuests.length})
          </h2>
          <p className="mb-3 text-xs text-ink-400">
            Members and guests who booked this class and later cancelled.
          </p>
          <ul className="divide-y divide-ink-100">
            {cancelled.map((b) => (
              <li key={b.id} className="py-2 text-sm">
                <span className="font-medium">
                  {b.user.firstName} {b.user.lastName}
                </span>{" "}
                <span className="text-ink-500">— {b.user.email}</span>
                <span className="badge ml-2 bg-ink-100 text-ink-500">
                  Cancelled
                </span>
              </li>
            ))}
            {cancelledGuests.map((g) => (
              <li key={g.id} className="py-2 text-sm">
                <span className="font-medium">
                  {g.firstName} {g.lastName}
                </span>{" "}
                <span className="text-ink-500">
                  — guest of {g.host.firstName} {g.host.lastName}
                </span>
                <span className="badge ml-2 bg-ink-100 text-ink-500">
                  Cancelled
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card mt-4 p-5">
        <h2 className="mb-1 font-semibold">Class notes</h2>
        <p className="mb-3 text-xs text-ink-400">
          A record for this class — who gave a heads-up they couldn&apos;t make
          it, how it went, anything worth remembering.
        </p>
        <SessionNotes sessionId={session.id} initial={session.notes ?? ""} />
      </div>

      {!session.cancelled && (
        <div className="mt-4">
          <AddToClassForm sessionId={session.id} members={addable} />
        </div>
      )}
    </div>
  );
}
