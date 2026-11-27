"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMembershipPrice } from "@/app/actions/admin";

// "Change price" on a member's membership in the CRM.
export function MembershipPriceEditor({
  membershipId,
  kind,
  billedOnline,
  regularCents,
  currentCents,
  custom,
  nextPayment,
}: {
  membershipId: string;
  kind: "MONTHLY" | "ONE_TIME";
  billedOnline: boolean;
  regularCents: number;
  currentCents: number;
  custom: boolean;
  nextPayment: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState((currentCents / 100).toFixed(2));
  const [removeDiscount, setRemoveDiscount] = useState(true);
  const [notify, setNotify] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const monthly = kind === "MONTHLY";

  function save(reset = false) {
    setMsg(null);
    const value = reset ? null : Number(price);
    if (!reset && (!price.trim() || !Number.isFinite(value as number))) {
      setMsg({ ok: false, text: "Enter a price." });
      return;
    }
    start(async () => {
      const res = await setMembershipPrice({
        membershipId,
        price: value,
        removeDiscount: billedOnline && removeDiscount,
        notify: monthly && notify,
      });
      if (res.ok) {
        setMsg({ ok: true, text: res.message });
        setOpen(false);
        router.refresh();
      } else setMsg({ ok: false, text: res.error });
    });
  }

  return (
    <div className="mt-2">
      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setMsg(null);
          }}
          className="text-xs font-medium text-brand-600 hover:underline"
        >
          {monthly ? "Edit price" : "Edit amount paid"}
        </button>
      ) : (
        <div className="rounded-xl border border-ink-200 bg-ink-50 p-3">
          <label className="label" htmlFor={`price-${membershipId}`}>
            {monthly ? "Their monthly price" : "Amount they paid"}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-ink-600">$</span>
            <input
              id={`price-${membershipId}`}
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="input w-28"
            />
            {monthly && <span className="text-sm text-ink-500">/ month</span>}
          </div>
          {monthly && (
            <p className="mt-1.5 text-xs text-ink-500">
              They keep this price every month until you change it or they cancel.
              The plan&apos;s current price is ${(regularCents / 100).toFixed(2)}/month.{" "}
              {billedOnline
                ? `Stripe will charge the new price starting with their next payment${
                    nextPayment ? ` (${nextPayment})` : ""
                  } — nothing is charged or refunded today.`
                : "This membership isn't billed online, so this is saved for your records."}
            </p>
          )}
          {monthly && billedOnline && (
            <label className="mt-2 flex items-start gap-2 text-xs text-ink-700">
              <input
                type="checkbox"
                checked={removeDiscount}
                onChange={(e) => setRemoveDiscount(e.target.checked)}
                className="mt-0.5"
              />
              Also remove any sale discount on their subscription, so they pay
              exactly this amount
            </label>
          )}
          {monthly && (
            <label className="mt-1.5 flex items-start gap-2 text-xs text-ink-700">
              <input
                type="checkbox"
                checked={notify}
                onChange={(e) => setNotify(e.target.checked)}
                className="mt-0.5"
              />
              Email them about their new price
            </label>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => save(false)}
              className="btn-primary text-xs"
            >
              {pending ? "Saving…" : "Save price"}
            </button>
            {monthly && custom && (
              <button
                type="button"
                disabled={pending}
                onClick={() => save(true)}
                className="btn-secondary text-xs"
              >
                Use current plan price (${(regularCents / 100).toFixed(2)})
              </button>
            )}
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-xs">
              Cancel
            </button>
          </div>
        </div>
      )}
      {msg && (
        <p className={`mt-1.5 text-xs ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>
      )}
    </div>
  );
}
