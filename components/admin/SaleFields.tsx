"use client";

import { useState } from "react";

export type SaleDefaults = {
  salePrice: string; // dollars, "" = none
  saleStarts: string; // yyyy-mm-dd
  saleEnds: string; // yyyy-mm-dd (last day of the sale)
  saleEndTime: string; // HH:MM on the last day ("23:59" = end of day)
  saleLockedIn: boolean;
  saleMonths: number;
};

const DURATIONS = [
  { value: "1", label: "1st month" },
  { value: "3", label: "3 months" },
  { value: "6", label: "6 months" },
  { value: "12", label: "12 months" },
  { value: "forever", label: "Locked in" },
];

// "Put this on sale" — a sale price with real start/end dates. Used on plan and
// event forms. Submits onSale / salePrice / saleStarts / saleEnds (+
// saleDuration for monthly memberships). Unticking it removes the sale.
export function SaleFields({
  defaults,
  monthly = false,
  idPrefix,
}: {
  defaults?: SaleDefaults;
  monthly?: boolean;
  idPrefix: string;
}) {
  const [on, setOn] = useState(Boolean(defaults?.salePrice));
  const currentDuration = defaults?.saleLockedIn
    ? "forever"
    : String(defaults?.saleMonths ?? 1);
  return (
    <div className="rounded-xl border border-clay-300 bg-clay-100/40 p-3">
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          name="onSale"
          checked={on}
          onChange={(e) => setOn(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          <span className="text-sm font-medium text-ink-800">Put this on sale</span>
          <span className="block text-xs text-ink-500">
            The website shows the sale price with the regular price crossed out
            and charges the sale price at checkout, until the sale ends.
          </span>
        </span>
      </label>
      {on && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor={`${idPrefix}-sale-price`}>
                Sale price ($)
              </label>
              <input
                id={`${idPrefix}-sale-price`}
                name="salePrice"
                type="number"
                step="0.01"
                min="0.5"
                className="input"
                defaultValue={defaults?.salePrice ?? ""}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor={`${idPrefix}-sale-starts`}>
                Starts
              </label>
              <input
                id={`${idPrefix}-sale-starts`}
                name="saleStarts"
                type="date"
                className="input px-2"
                defaultValue={defaults?.saleStarts ?? ""}
              />
            </div>
            <div>
              <label className="label" htmlFor={`${idPrefix}-sale-ends`}>
                Last day
              </label>
              <input
                id={`${idPrefix}-sale-ends`}
                name="saleEnds"
                type="date"
                className="input px-2"
                defaultValue={defaults?.saleEnds ?? ""}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor={`${idPrefix}-sale-end-time`}>
                Ends at
              </label>
              <input
                id={`${idPrefix}-sale-end-time`}
                name="saleEndTime"
                type="time"
                className="input px-2"
                defaultValue={defaults?.saleEndTime ?? "23:59"}
              />
            </div>
          </div>
          <p className="text-xs text-ink-500">
            Leave “Starts” blank to start right away. The sale ends at the time
            you pick on the last day (Central time), then the regular price comes
            back on its own.
          </p>
          {monthly && (
            <fieldset>
              <legend className="mb-1.5 text-xs font-medium text-ink-700">
                How long do new members keep the sale price?
              </legend>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map((d) => (
                  <label
                    key={d.value}
                    className="flex cursor-pointer items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-sm text-ink-700 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:font-medium has-[:checked]:text-brand-800"
                  >
                    <input
                      type="radio"
                      name="saleDuration"
                      value={d.value}
                      defaultChecked={d.value === currentDuration}
                    />
                    {d.label}
                  </label>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-ink-500">
                After that, their membership renews at the regular price.
                “Locked in” keeps the sale price for as long as they stay a member.
                Anyone who joins during the sale keeps their deal even after the
                sale ends.
              </p>
            </fieldset>
          )}
        </div>
      )}
    </div>
  );
}
