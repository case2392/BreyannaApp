import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { money, shortDate } from "@/lib/format";
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
  const now = new Date();
  const payments = stripeEnabled();

  // If the member just returned from Stripe checkout, make sure their
  // membership is activated (works even if the webhook didn't fire).
  if (searchParams.session_id) {
    await finalizeCheckoutSession(user.id, searchParams.session_id);
  }

  const [mine, plans] = await Promise.all([
    prisma.membership.findMany({
      where: { userId: user.id, status: "ACTIVE", expiresAt: { gt: now } },
      include: { plan: true },
      orderBy: { expiresAt: "asc" },
    }),
    prisma.membershipPlan.findMany({
      where: { active: true },
      orderBy: { priceCents: "asc" },
    }),
  ]);

  const hasSubscription = mine.some((m) => m.autoRenew);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Memberships &amp; passes</h1>
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
                  </div>
                  <span className="badge bg-green-100 text-green-700">Active</span>
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    {m.plan.kind === "UNLIMITED" ? (
                      <div className="text-2xl font-bold text-brand-600">∞</div>
                    ) : (
                      <div className="text-2xl font-bold text-brand-600">
                        {m.creditsRemaining}
                        <span className="ml-1 text-sm font-normal text-ink-500">
                          credits left
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right text-xs text-ink-500">
                    {m.source === "GIFT"
                      ? "Gifted 🤍"
                      : m.source === "COMP"
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
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
          Available plans
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <div key={p.id} className="card flex flex-col p-5">
              <span className="badge mb-2 self-start bg-brand-50 text-brand-700">
                {kindLabel[p.kind]}
              </span>
              <div className="text-lg font-bold">{p.name}</div>
              {p.description && (
                <p className="mt-1 text-sm text-ink-500">{p.description}</p>
              )}
              <div className="my-4">
                <span className="text-3xl font-bold">{money(p.priceCents)}</span>
                {p.kind === "UNLIMITED" && (
                  <span className="text-sm text-ink-500">/month</span>
                )}
              </div>
              <ul className="mb-5 space-y-1 text-sm text-ink-700">
                <li>
                  {p.kind === "UNLIMITED"
                    ? "Unlimited classes"
                    : `${p.credits} class credit${p.credits === 1 ? "" : "s"}`}
                </li>
                <li>
                  {p.kind === "UNLIMITED"
                    ? "Auto-renews monthly · cancel anytime"
                    : "Credits never expire"}
                </li>
              </ul>
              <div className="mt-auto">
                <BuyButton planId={p.id} />
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
