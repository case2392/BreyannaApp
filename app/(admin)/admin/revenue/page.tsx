import Link from "next/link";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { money } from "@/lib/format";
import { TransactionsTable, type Txn } from "@/components/admin/TransactionsTable";

export const dynamic = "force-dynamic";

function monthLabel(year: number, month: number) {
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
const ym = (y: number, m: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}`;

export default async function RevenuePage({
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

  const start = Date.UTC(year, month, 1) / 1000;
  const end = Date.UTC(year, month + 1, 1) / 1000;

  const prev = ym(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1);
  const next = ym(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1);
  const isCurrent = year === now.getUTCFullYear() && month === now.getUTCMonth();

  let txns: Txn[] = [];
  let total = 0;
  let configured = stripeEnabled();

  if (configured && stripe) {
    const charges: any[] = [];
    let params: any = {
      created: { gte: start, lt: end },
      limit: 100,
      expand: ["data.invoice"],
    };
    // Auto-paginate (cap for safety).
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const res = await stripe.charges.list(params);
      charges.push(...res.data);
      if (!res.has_more || charges.length >= 500) break;
      params = { ...params, starting_after: res.data[res.data.length - 1].id };
    }

    txns = charges
      .filter((c) => c.status === "succeeded")
      .map((c) => {
        const invoice = c.invoice && typeof c.invoice === "object" ? c.invoice : null;
        const what =
          c.description ||
          invoice?.lines?.data?.[0]?.description ||
          "Payment";
        return {
          id: c.id,
          created: c.created * 1000,
          amountCents: c.amount,
          refundedCents: c.amount_refunded ?? 0,
          name: c.billing_details?.name ?? "",
          email: c.billing_details?.email ?? c.receipt_email ?? "",
          what,
          type: invoice ? "Subscription" : "One-time",
        } as Txn;
      });
    total = txns.reduce((s, t) => s + (t.amountCents - t.refundedCents), 0);
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Revenue</h1>
      <p className="mb-6 text-sm text-ink-500">
        Every payment collected through Stripe — memberships, renewals, events,
        and donations.
      </p>

      {!configured ? (
        <div className="card p-8 text-center text-ink-500">
          Connect Stripe to see revenue.
        </div>
      ) : (
        <>
          {/* Month nav + total */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Link href={`/admin/revenue?month=${prev}`} className="btn-secondary text-sm">
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
                <Link href={`/admin/revenue?month=${next}`} className="btn-secondary text-sm">
                  Next →
                </Link>
              )}
            </div>
            <div className="card px-5 py-3 text-right">
              <div className="text-xs text-ink-500">
                Total{isCurrent ? " this month" : ""}
              </div>
              <div className="text-2xl font-bold text-brand-600">
                {money(total)}
              </div>
            </div>
          </div>

          <div className="mb-2 text-sm text-ink-500">
            {txns.length} transaction{txns.length === 1 ? "" : "s"}
          </div>
          <TransactionsTable txns={txns} />
        </>
      )}
    </div>
  );
}
