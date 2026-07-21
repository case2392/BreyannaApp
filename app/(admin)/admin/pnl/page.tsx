import Link from "next/link";
import { prisma } from "@/lib/db";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { money, shortDate } from "@/lib/format";
import { LedgerForm } from "@/components/admin/LedgerForm";
import { LedgerDeleteButton } from "@/components/admin/LedgerDeleteButton";

export const dynamic = "force-dynamic";

function monthLabel(year: number, month: number) {
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
const ym = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, "0")}`;

export default async function PnlPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const now = new Date();
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth();
  const m = /^(\d{4})-(\d{2})$/.exec(searchParams.month ?? "");
  if (m) {
    year = Number(m[1]);
    month = Number(m[2]) - 1;
  }

  const startDate = new Date(Date.UTC(year, month, 1));
  const endDate = new Date(Date.UTC(year, month + 1, 1));
  const prev = ym(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1);
  const next = ym(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1);
  const isCurrent = year === now.getUTCFullYear() && month === now.getUTCMonth();

  // Stripe net revenue (after fees) from balance transactions.
  let stripeGross = 0;
  let stripeFees = 0;
  let stripeNet = 0;
  if (stripeEnabled() && stripe) {
    try {
      const revTypes = new Set([
        "charge",
        "payment",
        "refund",
        "payment_refund",
      ]);
      let res = await stripe.balanceTransactions.list({
        created: { gte: startDate.getTime() / 1000, lt: endDate.getTime() / 1000 },
        limit: 100,
      });
      const add = (list: any[]) => {
        for (const bt of list)
          if (revTypes.has(bt.type)) {
            stripeGross += bt.amount;
            stripeFees += bt.fee;
            stripeNet += bt.net;
          }
      };
      add(res.data);
      let guard = 0;
      while (res.has_more && guard++ < 20) {
        res = await stripe.balanceTransactions.list({
          created: {
            gte: startDate.getTime() / 1000,
            lt: endDate.getTime() / 1000,
          },
          limit: 100,
          starting_after: res.data[res.data.length - 1].id,
        });
        add(res.data);
      }
    } catch {
      /* leave zeros */
    }
  }

  // Manual entries for the month.
  const entries = await prisma.ledgerEntry.findMany({
    where: { occurredAt: { gte: startDate, lt: endDate } },
    orderBy: { occurredAt: "desc" },
  });
  const otherRevenue = entries
    .filter((e) => e.kind === "REVENUE")
    .reduce((s, e) => s + e.amountCents, 0);
  const expenses = entries
    .filter((e) => e.kind === "EXPENSE")
    .reduce((s, e) => s + e.amountCents, 0);

  const totalRevenue = stripeNet + otherRevenue;
  const netProfit = totalRevenue - expenses;

  const defaultDate = (isCurrent ? now : startDate).toISOString().slice(0, 10);

  const Row = ({ label, value, strong = false, className = "" }: any) => (
    <div
      className={`flex items-center justify-between py-2 ${
        strong ? "font-semibold" : ""
      } ${className}`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Profit &amp; Loss</h1>
        <Link
          href={`/admin/revenue?month=${ym(year, month)}`}
          className="text-sm font-medium text-brand-600 hover:underline"
        >
          View Stripe transactions →
        </Link>
      </div>
      <p className="mb-6 text-sm text-ink-500">
        Stripe revenue after fees, plus expenses and other income you add — the
        month at a glance.
      </p>

      {/* Month nav */}
      <div className="mb-4 flex items-center gap-2">
        <Link href={`/admin/pnl?month=${prev}`} className="btn-secondary text-sm">
          ← Prev
        </Link>
        <span className="min-w-[9rem] text-center font-semibold">
          {monthLabel(year, month)}
        </span>
        {isCurrent ? (
          <span className="btn-secondary cursor-default text-sm opacity-40">
            Next →
          </span>
        ) : (
          <Link href={`/admin/pnl?month=${next}`} className="btn-secondary text-sm">
            Next →
          </Link>
        )}
      </div>

      {/* Net profit headline */}
      <div className="card mb-4 p-6">
        <div className="text-sm text-ink-500">Net profit</div>
        <div
          className={`mt-1 text-4xl font-bold ${
            netProfit >= 0 ? "text-brand-600" : "text-red-600"
          }`}
        >
          {money(netProfit)}
        </div>
        <div className="mt-4 border-t border-ink-100 pt-3 text-sm">
          <Row
            label="Stripe revenue (after fees)"
            value={money(stripeNet)}
          />
          <Row label="Other revenue" value={money(otherRevenue)} />
          <Row
            label="Total revenue"
            value={money(totalRevenue)}
            strong
            className="border-t border-ink-100"
          />
          <Row label="Expenses" value={`- ${money(expenses)}`} />
          <Row
            label="Net profit"
            value={money(netProfit)}
            strong
            className="border-t border-ink-100"
          />
        </div>
        <p className="mt-3 text-xs text-ink-400">
          Stripe: {money(stripeGross)} collected − {money(stripeFees)} in
          processing fees = {money(stripeNet)} net.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Manual entries */}
        <div>
          <h2 className="mb-3 font-semibold">
            Manual entries this month ({entries.length})
          </h2>
          {entries.length === 0 ? (
            <div className="card p-6 text-center text-sm text-ink-500">
              No expenses or other revenue added for this month yet.
            </div>
          ) : (
            <div className="card divide-y divide-ink-100">
              {entries.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium">{e.description}</div>
                    <div className="text-xs text-ink-500">
                      {shortDate(e.occurredAt)}
                      {e.category ? ` · ${e.category}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-semibold tabular-nums ${
                        e.kind === "REVENUE" ? "text-brand-600" : "text-red-600"
                      }`}
                    >
                      {e.kind === "REVENUE" ? "+" : "−"} {money(e.amountCents)}
                    </span>
                    <LedgerDeleteButton id={e.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add form */}
        <div>
          <LedgerForm defaultDate={defaultDate} />
        </div>
      </div>
    </div>
  );
}
