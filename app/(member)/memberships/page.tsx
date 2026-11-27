import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { shortDate, planPerks, money } from "@/lib/format";
import { studioNow } from "@/lib/time";
import { applySaunaIncludedDefaults } from "@/lib/saunaDefaults";
import { saleEndsLabel } from "@/lib/sale";
import { PlanCard, groupPlans, soonestSaleEnd } from "@/components/PlanCard";
import { stripeEnabled } from "@/lib/stripe";
import { finalizeCheckoutSession } from "@/lib/membership";
import {
  BuyButton,
  ManageBillingButton,
  CancelPlanButton,
} from "@/components/BuyButton";

export const dynamic = "force-dynamic";

const kindLabel: Record<string, string> = {
  UNLIMITED: "Unlimited",
  PACK: "Class pack",
  DROP_IN: "Drop-in",
};

export default async function MembershipsPage({
  searchParams,
}: {
  searchParams: { status?: string; session_id?: string };
}) {
  const user = (await getCurrentUser())!;
  const realNow = new Date();
  const payments = stripeEnabled();

  // If the member just returned from Stripe checkout, make sure their
  // membership is activated (works even if the webhook didn't fire).
  if (searchParams.session_id) {
    await finalizeCheckoutSession(user.id, searchParams.session_id);
  }

  await applySaunaIncludedDefaults();
  const [mine, plans, pastDue] = await Promise.all([
    prisma.membership.findMany({
      where: { userId: user.id, status: "ACTIVE", expiresAt: { gt: realNow } },
      include: { plan: true },
      orderBy: { expiresAt: "asc" },
    }),
    prisma.membershipPlan.findMany({
      where: { active: true },
      orderBy: { priceCents: "asc" },
    }),
    prisma.membership.findMany({
      where: { userId: user.id, status: "PAST_DUE" },
      include: { plan: true },
    }),
  ]);

  const hasSubscription = mine.some((m) => m.autoRenew);
  // Sale comparisons use the studio's clock (sale dates are studio dates).
  const now = studioNow();
  const saleOn = soonestSaleEnd(plans, now);
  const activePlanIds = new Set(mine.map((m) => m.plan.id));

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Pick your plan</h1>
      <p className="mb-6 text-sm text-ink-500">
        Your active plans and everything available at the studio.
      </p>

      {searchParams.status === "success" && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Thank you! Your purchase is confirmed — you&apos;re all set to book.
        </div>
      )}
      {searchParams.status === "cancel" && (
        <div className="mb-6 rounded-xl border border-ink-200 bg-ink-100 px-4 py-3 text-sm text-ink-700">
          Checkout cancelled — no charge was made.
        </div>
      )}

      {pastDue.length > 0 && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800">
          <div className="font-semibold">
            ⚠️ A payment didn&apos;t go through — your membership is paused
          </div>
          <p className="mt-1">
            We couldn&apos;t process the latest payment for your{" "}
            {pastDue.map((m) => m.plan.name).join(", ")} membership, so booking
            is paused for now. Update your payment method to turn access back on
            — it reactivates automatically once the payment clears.
          </p>
          <div className="mt-3">
            {payments ? (
              <ManageBillingButton />
            ) : (
              <span className="text-xs">Contact the studio to sort it out.</span>
            )}
          </div>
        </div>
      )}

      {mine.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
              Your active plans
            </h2>
            {payments && hasSubscription && <ManageBillingButton />}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {mine.map((m) => (
              <div key={m.id} className="card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{m.plan.name}</div>
                    <div className="text-xs text-ink-500">{kindLabel[m.plan.kind]}</div>
                    {m.plan.kind === "UNLIMITED" && m.customPriceCents != null && (
                      <div className="text-xs font-medium text-brand-700">
                        Your price: {money(m.customPriceCents)}/month
                      </div>
                    )}
                  </div>
                  <span className="badge bg-green-100 text-green-700">Active</span>
                </div>
                {planPerks(m.plan).length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-xs font-semibold text-brand-700">
                    {planPerks(m.plan).map((perk) => (
                      <li key={perk}>
                        ✦ {perk}{" "}
                        <Link
                          href={/sauna/i.test(perk) ? "/sauna" : "/schedule"}
                          className="font-medium text-brand-600 underline-offset-2 hover:underline"
                        >
                          {/sauna/i.test(perk) ? "Book →" : "See classes →"}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    {m.plan.kind === "UNLIMITED" ? (
                      <div className="text-2xl font-bold text-brand-600">∞</div>
                    ) : (
                      <div className="text-2xl font-bold text-brand-600">
                        {m.creditsRemaining}
                        <span className="ml-1 text-sm font-normal text-ink-500">
                          {m.plan.category === "SAUNA" ? "sauna sessions left" : "credits left"}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right text-xs text-ink-500">
                    {m.source === "GIFT" && !m.stripeSubscriptionId
                      ? "Gifted 🤍"
                      : m.source === "COMP" && !m.stripeSubscriptionId
                      ? "Complimentary"
                      : m.plan.kind === "UNLIMITED" ? (
                        <>
                          {m.autoRenew ? "Renews" : "Expires"}
                          <br />
                          {shortDate(m.expiresAt)}
                        </>
                      ) : (
                        "Credits don't expire"
                      )}
                  </div>
                </div>
                {(() => {
                  const gp = Math.max(
                    0,
                    m.plan.guestPassesPerMonth +
                      m.guestPassesBonus -
                      m.guestPassesUsed
                  );
                  if (gp <= 0) return null;
                  return (
                    <div className="mt-3 rounded-lg bg-clay-100/60 px-3 py-2 text-xs text-ink-600">
                      🎟️ <b>{gp}</b> guest pass{gp === 1 ? "" : "es"} available
                      {m.plan.kind === "UNLIMITED"
                        ? " this month"
                        : " — stays until used"}
                    </div>
                  );
                })()}
                {m.source === "PURCHASE" && (
                  <div className="mt-3 flex justify-end border-t border-ink-100 pt-3">
                    <CancelPlanButton membershipId={m.id} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-500">
          Available plans
        </h2>
        {saleOn && (
          <div className="mb-4 mt-3 rounded-xl border border-clay-300 bg-clay-100 px-4 py-3 text-sm text-ink-800">
            <span className="font-semibold">🎉 Sale prices are live!</span>{" "}
            {saleOn.endsAt ? `${saleEndsLabel(saleOn.endsAt, now)}. ` : ""}
            The prices below already include your discount.
          </div>
        )}
        <div className="space-y-8">
          {groupPlans(plans).map((g) => (
            <div key={g.kind}>
              <div className="mb-3 mt-3">
                <h3 className="text-lg font-semibold">{g.title}</h3>
                <p className="text-xs text-ink-500 sm:text-sm">
                  {g.blurb}
                  {g.kind === "SAUNA" && (
                    <>
                      {" "}
                      <Link href="/sauna" className="font-medium text-brand-600">
                        See times &amp; book →
                      </Link>
                    </>
                  )}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1 sm:gap-4 lg:grid-cols-3">
                {g.plans.map((p) => (
                  <div
                    key={p.id}
                    className={`flex ${g.plans.length === 1 ? "col-span-2 sm:col-span-1" : ""}`}
                  >
                  <PlanCard
                    plan={p}
                    now={now}
                    action={
                      activePlanIds.has(p.id) ? (
                        <button
                          disabled
                          className="w-full cursor-not-allowed rounded-full bg-ink-100 px-3 py-2 text-xs font-semibold text-ink-500 sm:text-sm"
                        >
                          ✓ Active member
                        </button>
                      ) : (
                        <BuyButton
                          planId={p.id}
                          returnTo={p.category === "SAUNA" ? "/sauna" : undefined}
                        />
                      )
                    }
                  />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {!payments && (
          <p className="mt-4 text-xs text-ink-400">
            Card payments aren&apos;t switched on yet — selecting a plan grants it
            instantly so you can try booking. Add your Stripe keys to take real
            payments.
          </p>
        )}
      </section>
    </div>
  );
}
