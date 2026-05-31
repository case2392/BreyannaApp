import Link from "next/link";
import { prisma } from "@/lib/db";
import { shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const now = new Date();
  const members = await prisma.user.findMany({
    where: { role: "MEMBER" },
    orderBy: { createdAt: "desc" },
    include: {
      memberships: {
        where: { status: "ACTIVE", expiresAt: { gt: now } },
        include: { plan: true },
      },
      _count: { select: { bookings: true } },
    },
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Members</h1>
      <p className="mb-6 text-sm text-ink-500">{members.length} members</p>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[28rem] text-sm">
          <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="hidden px-4 py-3 sm:table-cell">Membership</th>
              <th className="hidden px-4 py-3 md:table-cell">Joined</th>
              <th className="px-4 py-3 text-right">Bookings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {members.map((m) => {
              const active = m.memberships[0];
              return (
                <tr key={m.id} className="hover:bg-ink-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/members/${m.id}`}
                      className="font-medium text-ink-900 hover:text-brand-600"
                    >
                      {m.firstName} {m.lastName}
                    </Link>
                    <div className="text-xs text-ink-500">{m.email}</div>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {active ? (
                      <span className="badge bg-green-100 text-green-700">
                        {active.plan.name}
                      </span>
                    ) : (
                      <span className="badge bg-ink-100 text-ink-500">None</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-ink-500 md:table-cell">
                    {shortDate(m.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {m._count.bookings}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
