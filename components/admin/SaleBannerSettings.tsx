"use client";

import { useFormState, useFormStatus } from "react-dom";
import { saveSaleBanner } from "@/app/actions/admin";

function Save() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary text-sm">
      {pending ? "Saving…" : "Save banner"}
    </button>
  );
}

// CRM card: the site-wide sale banner (on by default; shows only while a sale
// is live).
export function SaleBannerSettings({
  settings,
  livePlanSales,
  liveEventSales,
}: {
  settings: { enabled: boolean; message: string };
  livePlanSales: number;
  liveEventSales: number;
}) {
  const [state, action] = useFormState(saveSaleBanner, {} as { ok?: boolean });
  const live = livePlanSales + liveEventSales;
  const parts = [
    livePlanSales > 0 && `${livePlanSales} plan${livePlanSales === 1 ? "" : "s"}`,
    liveEventSales > 0 && `${liveEventSales} event${liveEventSales === 1 ? "" : "s"}`,
  ].filter(Boolean);

  return (
    <form action={action} className="card border-clay-300 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">🎉 Sales &amp; sale banner</h2>
          <p className="mt-0.5 text-sm text-ink-500">
            To run a sale, click <b>Edit</b> on a plan below (or an event on the
            Events page) and tick <b>Put this on sale</b>.
          </p>
        </div>
        <span
          className={`badge ${
            live > 0 ? "bg-clay-300 text-ink-900" : "bg-ink-100 text-ink-500"
          }`}
        >
          {live > 0 ? `On sale now: ${parts.join(" & ")}` : "No sale running"}
        </span>
      </div>

      <label className="mt-4 flex items-start gap-2">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={settings.enabled}
          className="mt-0.5"
        />
        <span className="text-sm text-ink-700">
          Show a sale banner across the top of the website while a sale is on
          <span className="block text-xs text-ink-500">
            It links to the plans page and disappears on its own when the sale
            ends.
          </span>
        </span>
      </label>
      <div className="mt-3">
        <label className="label" htmlFor="sale-banner-message">
          Banner message (optional)
        </label>
        <input
          id="sale-banner-message"
          name="message"
          maxLength={140}
          defaultValue={settings.message}
          className="input"
          placeholder="Blank = “Sale on now — save up to 25% on plans”"
        />
        <p className="mt-1 text-xs text-ink-500">
          e.g. “Black Friday at Dwell — our best prices of the year!” The end
          date and a “See plans →” link are added for you.
        </p>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Save />
        {state?.ok && <span className="text-sm text-green-700">Saved ✓</span>}
      </div>
    </form>
  );
}
