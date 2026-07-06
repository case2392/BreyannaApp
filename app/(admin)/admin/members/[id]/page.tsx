import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { shortDate, dayLabel, timeLabel, money, timeAgo } from "@/lib/format";
import { MemberNotes } from "@/components/admin/MemberNotes";
import {
  GrantMembership,
  DeleteMemberButton,
  RemoveMembershipButton,
  ResetMemberPassword,
} from "@/components/admin/MemberTools";

export const dynamic = "force-dynamic";

const statusColor: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  EXPIRED: "bg-ink-100 text-ink-500",
  CANCELLED: "bg-red-100 text-red-700",
};

export default async function MemberDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [member, plans, lastBooking] = await Promise.all([
    prisma.user.findUnique({
      where: { id: params.id },
      include: {
        memberships: { include: { plan: true }, orderBy: { createdAt: "desc" } },
        bookings: {
          where: { status: { not: "CANCELLED" } },
          include: { session: { include: { classType: true } } },
          orderBy: { session: { startsAt: "desc" } },
          take: 10,
        },
      },
    }),
    prisma.membershipPlan.findMany({
      where: { active: true },
      orderBy: { priceCents: "asc" },
      select: { id: true, name: true },
    }),
    // Most recent time this member booked a class (any status).
    prisma.booking.findFirst({
      where: { userId: params.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  if (!member || member.role !== "MEMBER") notFound();

  const now = new Date();
  const totalSpent = member.memberships.reduce(
    (sum, m) => sum + m.pricePaidCents,
    0
  );

  return (
    <div>
      <Link href="/admin/members" className="text-sm text-brand-600">
        ← Back to members
      </Link>

      <div className="mt-3 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">
          {member.firstName[0]}
          {member.lastName[0]}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {member.firstName} {member.lastName}
          </h1>
          <div className="text-sm text-ink-500">
            {member.email}
            {member.phone ? ` · ${member.phone}` : ""}
          </div>
        </div>
        <DeleteMemberButton userId={member.id} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <div className="text-xs text-ink-500">Last sign-in</div>
          <div className="text-lg font-semibold">{timeAgo(member.lastLoginAt)}</div>
          <div className="text-xs text-ink-400">
            {member.lastLoginAt ? shortDate(member.lastLoginAt) : "Hasn't signed in yet"}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ink-500">Last booked a class</div>
          <div className="text-lg font-semibold">
            {timeAgo(lastBooking?.createdAt)}
          </div>
          <div className="text-xs text-ink-400">
            {lastBooking ? shortDate(lastBooking.createdAt) : "No bookings yet"}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ink-500">Member since</div>
          <div className="text-lg font-semibold">{shortDate(member.createdAt)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ink-500">Lifetime spend</div>
          <div className="text-lg font-semibold">{money(totalSpent)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ink-500">Bookings</div>
          <div className="text-lg font-semibold">{member.bookings.length}</div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-semibold">Memberships</h2>
          <div className="card mb-3 p-4">
            <GrantMembership userId={member.id} plans={plans} />
          </div>
          <div className="space-y-2">
            {member.memberships.length === 0 && (
              <div className="card p-4 text-sm text-ink-500">
                No memberships purchased.
              </div>
            )}
            {member.memberships.map((m) => {
              const comp = m.source === "COMP" || m.source === "GIFT";
              const expired = m.expiresAt < now;
              const label =
                m.status === "ACTIVE" && expired ? "EXPIRED" : m.status;
              const validity =
                m.plan.kind === "UNLIMITED"
                  ? comp
                    ? "Unlimited · never expires"
                    : `Unlimited · ${m.autoRenew ? "renews" : "expires"} ${shortDate(m.expiresAt)}`
                  : `${m.creditsRemaining} credits left · no expiry`;
              const cost = comp
                ? m.source === "GIFT"
                  ? "Gift"
                  : "Complimentary"
                : `paid ${money(m.pricePaidCents)}`;
              return (
                <div key={m.id} className="card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{m.plan.name}</div>
                    <div className="flex items-center gap-2">
                      {comp && (
                        <span className="badge bg-brand-50 text-brand-700">
                          {m.source === "GIFT" ? "Gift" : "Comp"}
                        </span>
                      )}
                      <span className={`badge ${statusColor[label]}`}>{label}</span>
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-ink-500">
                    {validity} · {cost}
                  </div>
                  {m.status === "ACTIVE" && (
                    <div className="mt-2 flex justify-end">
                      <RemoveMembershipButton membershipId={m.id} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <h2 className="mb-3 mt-6 font-semibold">Studio notes</h2>
          <MemberNotes userId={member.id} initial={member.notes ?? ""} />

          <h2 className="mb-3 mt-6 font-semibold">Account</h2>
          <div className="card p-4">
            <ResetMemberPassword userId={member.id} />
          </div>
        </div>

        <div>
          <h2 className="mb-3 font-semibold">Recent activity</h2>
          <div className="space-y-2">
            {member.bookings.length === 0 && (
              <div className="card p-4 text-sm text-ink-500">No bookings yet.</div>
            )}
            {member.bookings.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-xl border border-ink-200 bg-white px-4 py-3"
              >
                <div>
                  <div className="font-medium">{b.session.classType.name}</div>
                  <div className="text-xs text-ink-500">
                    {dayLabel(b.session.startsAt)} · {timeLabel(b.session.startsAt)}
                  </div>
                </div>
                <span className="badge bg-ink-100 text-ink-700">
                  {b.status.toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
