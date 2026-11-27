"use client";

import { useState } from "react";

export type SaleDefaults = {
  salePrice: string; // dollars, "" = none
  saleStarts: string; // yyyy-mm-dd
  saleEnds: string; // yyyy-mm-dd (last day of the sale)
  saleLockedIn: boolean;
};

// "Put this on sale" — a sale price with real start/end dates. Used on plan and
// event forms. Submits onSale / salePrice / saleStarts / saleEnds (+
// saleLockedIn for monthly memberships). Unticking it removes the sale.
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
          <div className="grid grid-cols-3 gap-2">
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
          </div>
          <p className="text-xs text-ink-500">
            Leave “Starts” blank to start right away. The sale runs through 11:59 PM
            on the last day, then the regular price comes back on its own.
          </p>
          {monthly && (
            <fieldset className="space-y-1.5">
              <legend className="mb-1 text-xs font-medium text-ink-700">
                For this monthly membership, the sale price is…
              </legend>
              <label className="flex items-start gap-2 text-sm text-ink-700">
                <input
                  type="radio"
                  name="saleLockedIn"
                  value="0"
                  defaultChecked={!defaults?.saleLockedIn}
                  className="mt-1"
                />
                <span>
                  For the <b>first month</b>, then the regular price
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm text-ink-700">
                <input
                  type="radio"
                  name="saleLockedIn"
                  value="1"
                  defaultChecked={Boolean(defaults?.saleLockedIn)}
                  className="mt-1"
                />
                <span>
                  <b>Locked in</b> every month for as long as they stay a member
                </span>
              </label>
            </fieldset>
          )}
        </div>
      )}
    </div>
  );
}
