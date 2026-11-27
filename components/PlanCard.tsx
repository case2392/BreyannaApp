import type { ReactNode } from "react";
import { money, planInclusions } from "@/lib/format";
import { activeSale, saleEndsLabel, savingsLabel } from "@/lib/sale";
import { PriceTag, displayMoney } from "@/components/PriceTag";

export type PlanCardPlan = {
  id: string;
  name: string;
  description: string | null;
  kind: string;
  credits: number;
  priceCents: number;
  guestPassesPerMonth: number;
  restrictedClass: string | null;
  salePriceCents: number | null;
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
  saleLockedIn: boolean;
};

// Plans are shown in three groups so the differences are obvious at a glance.
export const PLAN_GROUPS = [
  {
    kind: "UNLIMITED",
    title: "Memberships",
    blurb: "Come as often as you like. Billed monthly.",
  },
  {
    kind: "PACK",
    title: "Class packs",
    blurb: "Pay once, use at your own pace. Credits never expire.",
  },
  {
    kind: "DROP_IN",
    title: "Single class",
    blurb: "Try a class or drop in anytime.",
  },
] as const;

export function groupPlans<T extends { kind: string }>(plans: T[]) {
  return PLAN_GROUPS.map((g) => ({
    ...g,
    plans: plans.filter((p) => p.kind === g.kind),
  })).filter((g) => g.plans.length > 0);
}

// The soonest-ending live sale among these, for a "Sale ends …" notice.
export function soonestSaleEnd(plans: PlanCardPlan[], now?: Date) {
  let soonest: Date | null = null;
  let any = false;
  for (const p of plans) {
    const s = activeSale(p, now);
    if (!s) continue;
    any = true;
    if (s.endsAt && (!soonest || s.endsAt < soonest)) soonest = s.endsAt;
  }
  return any ? { endsAt: soonest } : null;
}

export function PlanCard({
  plan,
  action,
  size = "compact",
  now,
}: {
  plan: PlanCardPlan;
  action: ReactNode;
  size?: "compact" | "large";
  now?: Date;
}) {
  const sale = activeSale(plan, now);
  const unlimited = plan.kind === "UNLIMITED";
  const priceCents = sale?.saleCents ?? plan.priceCents;
  const perClass =
    !unlimited && plan.credits > 1 ? Math.round(priceCents / plan.credits) : null;
  const large = size === "large";

  return (
    <div
      className={`card card-interactive relative flex w-full flex-col ${
        large ? "p-6" : "p-4 sm:p-5"
      } ${sale ? "ring-2 ring-clay-300" : ""}`}
    >
      {sale && (
        <span className="badge absolute -top-2.5 right-3 bg-clay-300 font-semibold text-ink-900 shadow-sm">
          {savingsLabel(sale)}
        </span>
      )}
      <div
        className={`font-bold leading-tight ${large ? "text-xl" : "text-base sm:text-lg"}`}
      >
        {plan.name}
      </div>
      {plan.description && (
        <p className={`mt-1 text-ink-500 ${large ? "text-sm" : "text-xs sm:text-sm"}`}>
          {plan.description}
        </p>
      )}

      <div className={large ? "mt-4" : "mt-3"}>
        <PriceTag
          fullCents={plan.priceCents}
          saleCents={sale?.saleCents}
          per={unlimited ? "/month" : undefined}
          size={large ? "xl" : "lg"}
        />
        {sale && unlimited && (
          <p className="mt-1 text-xs font-medium text-brand-700">
            {plan.saleLockedIn
              ? "Sale price locked in every month"
              : `First month, then ${displayMoney(plan.priceCents)}/month`}
          </p>
        )}
        {perClass != null && (
          <p className="mt-1 text-xs text-ink-500">
            {money(perClass)} per class
          </p>
        )}
        {sale?.endsAt && (
          <p className="mt-1 text-xs font-semibold text-ink-700">
            <span aria-hidden="true">⏳ </span>
            {saleEndsLabel(sale.endsAt, now)}
          </p>
        )}
      </div>

      <ul
        className={`mb-4 space-y-1 text-ink-700 ${
          large ? "mt-4 text-sm" : "mt-3 text-xs sm:mb-5 sm:text-sm"
        }`}
      >
        {planInclusions(plan).map((item) => (
          <li key={item} className="flex gap-1.5">
            <span className="text-brand-500" aria-hidden="true">
              ✓
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto">{action}</div>
    </div>
  );
}
