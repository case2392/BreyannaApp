import { prisma } from "@/lib/db";
import { money, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-5">
      <div className="text-sm text-ink-500">{label}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-400">{sub}</div>}
    </div>
  );
}

export default async function SponsorshipsPage() {
  const [donations, agg, recurringCount] = await Promise.all([
    prisma.donation.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.donation.aggregate({ _sum: { amountCents: true }, _count: true }),
    prisma.donation.count({ where: { recurring: true } }),
  ]);

  const total = agg._sum.amountCents ?? 0;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Sponsor a Sister</h1>
      <p className="mb-6 text-sm text-ink-500">
        Donations that fund sponsored memberships. Use a member&apos;s profile to
        grant a gifted membership from these funds.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total raised" value={money(total)} sub="All-time" />
        <Stat label="Gifts" value={String(agg._count)} />
        <Stat label="Recurring gifts" value={String(recurringCount)} sub="Monthly sponsors" />
      </div>

      <h2 className="mb-3 mt-8 font-semibold">Recent donations</h2>
      {donations.length === 0 ? (
        <div className="card p-6 text-center text-sm text-ink-500">
          No donations yet. Share your Sponsor a Sister page to start receiving gifts.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3">Sponsor</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="hidden px-4 py-3 text-right sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {donations.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{d.name || d.email || "Anonymous"}</div>
                    {d.name && d.email && (
                      <div className="text-xs text-ink-500">{d.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${d.recurring ? "bg-brand-50 text-brand-700" : "bg-ink-100 text-ink-600"}`}>
                      {d.recurring ? "Monthly" : "One-time"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{money(d.amountCents)}</td>
                  <td className="hidden px-4 py-3 text-right text-ink-500 sm:table-cell">
                    {shortDate(d.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
