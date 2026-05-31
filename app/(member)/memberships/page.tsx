import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { money, shortDate } from "@/lib/format";
import { BuyButton } from "@/components/BuyButton";

export const dynamic = "force-dynamic";

const kindLabel: Record<string, string> = {
  UNLIMITED: "Unlimited",
  PACK: "Class pack",
  DROP_IN: "Drop-in",
};

export default async function MembershipsPage() {
  const user = (await getCurrentUser())!;
  const now = new Date();

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

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Memberships &amp; passes</h1>
      <p className="mb-6 text-sm text-ink-500">
        Your active plans and everything available at the studio.
      </p>

      {mine.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
            Your active plans
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {mine.map((m) => (
              <div key={m.id} className="card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{m.plan.name}</div>
                    <div className="text-xs text-ink-500">
                      {kindLabel[m.plan.kind]}
                    </div>
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
                    Expires
                    <br />
                    {shortDate(m.expiresAt)}
                  </div>
                </div>
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
              </div>
              <ul className="mb-5 space-y-1 text-sm text-ink-700">
                <li>
                  {p.kind === "UNLIMITED"
                    ? "Unlimited classes"
                    : `${p.credits} class credit${p.credits === 1 ? "" : "s"}`}
                </li>
                <li>Valid for {p.durationDays} days</li>
              </ul>
              <div className="mt-auto">
                <BuyButton planId={p.id} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-ink-400">
          Card payments are not enabled in this version — selecting a plan grants
          it instantly so you can try out booking.
        </p>
      </section>
    </div>
  );
}
