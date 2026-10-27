// Checklist of membership plans that may book a class type. Submits the checked
// plan ids as repeated `allowedPlanIds` form fields.
export type PlanOpt = { id: string; name: string; kindLabel: string };

export function PlanChecklist({
  plans,
  selected = [],
}: {
  plans: PlanOpt[];
  selected?: string[];
}) {
  return (
    <fieldset className="rounded-xl border border-ink-200 p-3 sm:col-span-2">
      <legend className="px-1 text-sm font-medium text-ink-700">
        Who can book this class?
      </legend>
      <p className="mb-2 text-xs text-ink-500">
        Check every membership or pass that may be used to book this class. Only
        checked plans will work — e.g. for Mommy &amp; Me, check only your Mommy
        &amp; Me plans; for adult classes, include Single Class.
      </p>
      {plans.length === 0 ? (
        <p className="text-xs text-ink-500">No plans yet — add some in Plans.</p>
      ) : (
        <div className="grid gap-1 sm:grid-cols-2">
          {plans.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="allowedPlanIds"
                value={p.id}
                defaultChecked={selected.includes(p.id)}
              />
              <span>
                {p.name}{" "}
                <span className="text-xs text-ink-500">({p.kindLabel})</span>
              </span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}
