"use client";

import { useState } from "react";

// "What is this plan for?" — classes & events, or the infrared sauna.
export function PlanCategoryPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <fieldset>
      <legend className="label">What is this plan for?</legend>
      <div className="flex gap-2">
        {[
          { v: "CLASS", label: "Classes" },
          { v: "SAUNA", label: "Sauna" },
        ].map((o) => (
          <label
            key={o.v}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-2 text-sm text-ink-700 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:font-medium has-[:checked]:text-brand-800"
          >
            <input
              type="radio"
              name="category"
              value={o.v}
              checked={value === o.v}
              onChange={() => onChange(o.v)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
      {value === "SAUNA" && (
        <p className="mt-1 text-xs text-ink-500">
          Sauna plans only book the sauna (never classes or events). Members book
          times on the Sauna page.
        </p>
      )}
    </fieldset>
  );
}

export const kindOptions = (category: string) =>
  category === "SAUNA"
    ? [
        { v: "DROP_IN", label: "Single session" },
        { v: "PACK", label: "Session pack" },
        { v: "UNLIMITED", label: "Unlimited (monthly)" },
      ]
    : [
        { v: "PACK", label: "Class pack" },
        { v: "UNLIMITED", label: "Unlimited (monthly)" },
        { v: "DROP_IN", label: "Drop-in" },
      ];

// Class plans: how much infrared sauna the membership includes each month.
// Submits saunaIncluded ("NONE" | "LIMITED" | "UNLIMITED") + saunaPerMonth.
export function SaunaIncludedField({ defaultPerMonth = 0 }: { defaultPerMonth?: number }) {
  const initial = defaultPerMonth < 0 ? "UNLIMITED" : defaultPerMonth > 0 ? "LIMITED" : "NONE";
  const [mode, setMode] = useState(initial);
  return (
    <fieldset className="rounded-xl border border-ink-200 p-3">
      <legend className="px-1 text-sm font-medium text-ink-800">Sauna included</legend>
      <div className="flex flex-wrap items-center gap-2">
        {[
          { v: "NONE", label: "None" },
          { v: "LIMITED", label: "Sessions per month" },
          { v: "UNLIMITED", label: "Unlimited" },
        ].map((o) => (
          <label
            key={o.v}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-sm text-ink-700 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:font-medium has-[:checked]:text-brand-800"
          >
            <input
              type="radio"
              name="saunaIncluded"
              value={o.v}
              checked={mode === o.v}
              onChange={() => setMode(o.v)}
            />
            {o.label}
          </label>
        ))}
        {mode === "LIMITED" && (
          <span className="flex items-center gap-1.5 text-sm text-ink-700">
            <input
              name="saunaPerMonth"
              type="number"
              min={1}
              max={60}
              defaultValue={defaultPerMonth > 0 ? defaultPerMonth : 1}
              className="input w-20 px-2 py-1.5"
              aria-label="Sauna sessions per month"
            />
            per month
          </span>
        )}
      </div>
      <p className="mt-1.5 text-xs text-ink-500">
        Members on this plan can book the sauna with it — counted per calendar
        month (unused sessions don&apos;t roll over).
      </p>
    </fieldset>
  );
}

// Class plans: N classes a month from classes this plan can't normally book
// (e.g. Mommy & Me Unlimited → 1 adult class a month). Submits
// bonusClassesPerMonth + bonusClassTypeIds (checkboxes).
export function BonusClassesField({
  classTypes,
  defaultPerMonth = 0,
  defaultIds = [],
}: {
  classTypes: { id: string; name: string }[];
  defaultPerMonth?: number;
  defaultIds?: string[];
}) {
  const [on, setOn] = useState(defaultPerMonth > 0);
  const [ids, setIds] = useState<string[]>(defaultIds);
  return (
    <fieldset className="rounded-xl border border-ink-200 p-3">
      <legend className="px-1 text-sm font-medium text-ink-800">Bonus classes</legend>
      <label className="flex items-start gap-2 text-sm text-ink-700">
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => setOn(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          Members on this plan can also book a few other classes each month
          <span className="block text-xs text-ink-500">
            e.g. Mommy &amp; Me Unlimited → 1 adult class a month
          </span>
        </span>
      </label>
      {on && (
        <div className="mt-3 space-y-2">
          <span className="flex items-center gap-1.5 text-sm text-ink-700">
            <input
              name="bonusClassesPerMonth"
              type="number"
              min={1}
              max={30}
              defaultValue={defaultPerMonth > 0 ? defaultPerMonth : 1}
              className="input w-20 px-2 py-1.5"
              aria-label="Bonus classes per month"
            />
            class(es) a month, from:
          </span>
          <div className="grid gap-1 sm:grid-cols-2">
            {classTypes.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  name="bonusClassTypeIds"
                  value={c.id}
                  checked={ids.includes(c.id)}
                  onChange={(e) =>
                    setIds((cur) =>
                      e.target.checked ? [...cur, c.id] : cur.filter((x) => x !== c.id)
                    )
                  }
                />
                {c.name}
              </label>
            ))}
          </div>
          {ids.length === 0 && (
            <p className="text-xs text-amber-700">Tick the classes the bonus can be used for.</p>
          )}
          <p className="text-xs text-ink-500">
            Counted per calendar month (unused classes don&apos;t roll over). Cancelling
            a bonus class frees it up again.
          </p>
        </div>
      )}
    </fieldset>
  );
}
