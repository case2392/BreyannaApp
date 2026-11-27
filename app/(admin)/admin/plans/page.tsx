import { prisma } from "@/lib/db";
import { CreatePlanForm } from "@/components/admin/CreateForms";
import { PlanRow } from "@/components/admin/PlanRow";
import { SaleBannerSettings } from "@/components/admin/SaleBannerSettings";
import { money } from "@/lib/format";
import { saleDefaults, saleSummary, activeSale, saleDurationLabel } from "@/lib/sale";
import { getSaleBannerSettings } from "@/lib/saleBanner";
import { applySaunaIncludedDefaults } from "@/lib/saunaDefaults";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  await applySaunaIncludedDefaults();
  const [plans, classTypeRows, bannerSettings, saleEvents, allClassTypes] = await Promise.all([
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
    getSaleBannerSettings(),
    prisma.event.findMany({
      where: { active: true, salePriceCents: { not: null } },
      select: { priceCents: true, salePriceCents: true, saleStartsAt: true, saleEndsAt: true },
    }),
    // For "Bonus classes": every bookable (non-free) class type.
    prisma.classType.findMany({
      where: { active: true, free: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const livePlanSales = plans.filter((p) => p.active && activeSale(p)).length;
  const liveEventSales = saleEvents.filter((e) => activeSale(e)).length;
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

      <div className="mb-6">
        <SaleBannerSettings
          settings={bannerSettings}
          livePlanSales={livePlanSales}
          liveEventSales={liveEventSales}
        />
      </div>

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
              bonusClassTypes={allClassTypes}
              plan={{
                id: p.id,
                name: p.name,
                description: p.description,
                kind: p.kind,
                category: p.category,
                saunaPerMonth: p.saunaPerMonth,
                bonusClassesPerMonth: p.bonusClassesPerMonth,
                bonusClassTypeIds: (p.bonusClassTypeIds ?? "").split(",").filter(Boolean),
                credits: p.credits,
                priceCents: p.priceCents,
                durationDays: p.durationDays,
                active: p.active,
                activeSales: p._count.memberships,
                restrictedClass: p.restrictedClass,
                guestPassesPerMonth: p.guestPassesPerMonth,
                sale: saleDefaults(p),
                saleSummary: (() => {
                  const sum = saleSummary(p, money);
                  if (!sum || p.kind !== "UNLIMITED") return sum;
                  return {
                    ...sum,
                    text: `${sum.text} · ${saleDurationLabel(p.saleLockedIn, p.saleMonths)}`,
                  };
                })(),
              }}
            />
          ))}
        </div>

        <div>
          <CreatePlanForm classTypes={classTypes} bonusClassTypes={allClassTypes} />
        </div>
      </div>
    </div>
  );
}
