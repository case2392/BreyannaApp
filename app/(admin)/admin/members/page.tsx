import { prisma } from "@/lib/db";
import { shortDate, timeAgo } from "@/lib/format";
import { AddMemberForm } from "@/components/admin/MemberTools";
import { MembersTable, type MemberRow } from "@/components/admin/MembersTable";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const now = new Date();
  const members = await prisma.user.findMany({
    where: { role: "MEMBER" },
    orderBy: { createdAt: "desc" },
    include: {
      memberships: {
        where: {
          OR: [
            { status: "ACTIVE", expiresAt: { gt: now } },
            { status: "PAST_DUE" },
          ],
        },
        include: { plan: true },
      },
      _count: { select: { bookings: true } },
    },
  });

  const rows: MemberRow[] = members.map((m) => {
    const active = m.memberships.filter((mm) => mm.status === "ACTIVE");
    const renewing = active.find((mm) => mm.autoRenew);
    return {
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email,
      phone: m.phone,
      plans: Array.from(new Set(active.map((mm) => mm.plan.name))),
      pastDue: m.memberships.some((mm) => mm.status === "PAST_DUE"),
      renews: renewing ? shortDate(renewing.expiresAt) : null,
      lastSeen: timeAgo(m.lastSeenAt ?? m.lastLoginAt),
      joined: shortDate(m.createdAt),
      bookings: m._count.bookings,
    };
  });

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Members</h1>
      </div>

      <div className="mb-4">
        <AddMemberForm />
      </div>

      <MembersTable members={rows} />
    </div>
  );
}
