import { prisma } from "@/lib/db";
import { money } from "@/lib/format";
import { CreatePlanForm } from "@/components/admin/CreateForms";
import { PlanToggle } from "@/components/admin/PlanToggle";

export const dynamic = "force-dynamic";

const kindLabel: Record<string, string> = {
  UNLIMITED: "Unlimited",
  PACK: "Class pack",
  DROP_IN: "Drop-in",
};

export default async function PlansPage() {
  const plans = await prisma.membershipPlan.findMany({
    orderBy: { priceCents: "asc" },
    include: {
      _count: {
        select: { memberships: { where: { status: "ACTIVE" } } },
      },
    },
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Membership plans</h1>
      <p className="mb-6 text-sm text-ink-500">
        Memberships, class packs and drop-ins members can buy. Toggle a plan to
        show or hide it in the member app.
      </p>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Active sales</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {plans.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-ink-500">
                        {p.kind === "UNLIMITED"
                          ? `${p.durationDays} days`
                          : `${p.credits} credits · ${p.durationDays} days`}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-500">
                      {kindLabel[p.kind]}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {money(p.priceCents)}
                    </td>
                    <td className="px-4 py-3 text-right">{p._count.memberships}</td>
                    <td className="px-4 py-3 text-right">
                      <PlanToggle planId={p.id} active={p.active} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <CreatePlanForm />
        </div>
      </div>
    </div>
  );
}
