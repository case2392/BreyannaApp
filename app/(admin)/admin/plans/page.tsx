import { prisma } from "@/lib/db";
import { CreatePlanForm } from "@/components/admin/CreateForms";
import { PlanRow } from "@/components/admin/PlanRow";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const [plans, classTypeRows] = await Promise.all([
    prisma.membershipPlan.findMany({
      orderBy: { priceCents: "asc" },
      include: {
        _count: {
          select: { memberships: { where: { status: "ACTIVE" } } },
        },
      },
    }),
    // Class types whose "who can book" list has been set up.
    prisma.classType.findMany({
      where: { allowedPlanIds: { not: null } },
      orderBy: [{ active: "desc" }, { name: "asc" }],
      select: { id: true, name: true, active: true, allowedPlanIds: true },
    }),
  ]);
  const classTypes = classTypeRows
    .map((c) => ({
      id: c.id,
      name: c.active ? c.name : `${c.name} (hidden)`,
      allowedPlanIds: (c.allowedPlanIds ?? "").split(",").filter(Boolean),
    }))
    .filter((c) => c.allowedPlanIds.length > 0);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Membership plans</h1>
      <p className="mb-6 text-sm text-ink-500">
        Memberships, class packs and drop-ins members can buy. Edit prices and
        details, hide a plan from the member app, or remove it.
      </p>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-2 lg:col-span-2">
          {plans.length === 0 && (
            <div className="card p-6 text-center text-sm text-ink-500">
              No plans yet — add your first one.
            </div>
          )}
          {plans.map((p) => (
            <PlanRow
              key={p.id}
              classTypes={classTypes}
              plan={{
                id: p.id,
                name: p.name,
                description: p.description,
                kind: p.kind,
                credits: p.credits,
                priceCents: p.priceCents,
                durationDays: p.durationDays,
                active: p.active,
                activeSales: p._count.memberships,
                restrictedClass: p.restrictedClass,
                guestPassesPerMonth: p.guestPassesPerMonth,
              }}
            />
          ))}
        </div>

        <div>
          <CreatePlanForm classTypes={classTypes} />
        </div>
      </div>
    </div>
  );
}
