// On a plan's form: which class types this plan can book. Lists only class
// types whose "who can book" list has been set up (the others follow their
// default rules). Submits checked ids as `classTypeIds`.
export type ClassAccessOpt = {
  id: string;
  name: string;
  allowedPlanIds: string[];
};

export function ClassAccessChecklist({
  classTypes,
  planId,
}: {
  classTypes: ClassAccessOpt[];
  planId?: string;
}) {
  return (
    <fieldset className="rounded-xl border border-ink-200 p-3">
      {/* Tells the server this section was shown, so it's safe to sync. */}
      <input type="hidden" name="classAccessShown" value="1" />
      <legend className="px-1 text-sm font-medium text-ink-700">
        Which classes can this plan book?
      </legend>
      {classTypes.length === 0 ? (
        <p className="text-xs text-ink-500">
          No classes have their booking plans chosen yet. Set them up in
          Classes, and they&apos;ll appear here.
        </p>
      ) : (
        <>
          <p className="mb-2 text-xs text-ink-500">
            Same as the &ldquo;Who can book this class?&rdquo; boxes in Classes —
            just from the plan&apos;s side. Classes without a list set up follow
            their default rules and aren&apos;t shown.
          </p>
          <div className="grid gap-1 sm:grid-cols-2">
            {classTypes.map((ct) => (
              <label key={ct.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="classTypeIds"
                  value={ct.id}
                  defaultChecked={planId ? ct.allowedPlanIds.includes(planId) : false}
                />
                <span>{ct.name}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </fieldset>
  );
}
