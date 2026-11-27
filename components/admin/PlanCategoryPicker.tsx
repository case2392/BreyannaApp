"use client";

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
