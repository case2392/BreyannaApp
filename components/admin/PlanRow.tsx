"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { updatePlan, deletePlan, togglePlan } from "@/app/actions/admin";
import { money } from "@/lib/format";

const kindLabel: Record<string, string> = {
  UNLIMITED: "Unlimited",
  PACK: "Class pack",
  DROP_IN: "Drop-in",
};

type Plan = {
  id: string;
  name: string;
  description: string | null;
  kind: string;
  credits: number;
  priceCents: number;
  durationDays: number;
  active: boolean;
  activeSales: number;
  restrictedClass: string | null;
  guestPassesPerMonth: number;
};

function SaveBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary text-xs" disabled={pending}>
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

export function PlanRow({ plan }: { plan: Plan }) {
  const [editing, setEditing] = useState(false);
  const [kind, setKind] = useState(plan.kind);
  const [pending, start] = useTransition();
  const router = useRouter();
  const [state, action] = useFormState(
    async (prev: unknown, fd: FormData) => {
      const res = await updatePlan(prev, fd);
      if (res?.ok) setEditing(false);
      return res;
    },
    {} as { error?: string; ok?: boolean }
  );
  const unlimited = kind === "UNLIMITED";

  function toggleActive() {
    start(async () => {
      await togglePlan(plan.id, !plan.active);
      router.refresh();
    });
  }

  function remove() {
    if (!confirm(`Delete "${plan.name}"? This can't be undone.`)) return;
    start(async () => {
      const res = await deletePlan(plan.id);
      if (!res.ok) alert(res.error);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <form action={action} className="card p-4">
        <input type="hidden" name="id" value={plan.id} />
        {state?.error && (
          <p className="mb-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700">{state.error}</p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Name</label>
            <input name="name" defaultValue={plan.name} className="input" required />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Description</label>
            <input name="description" defaultValue={plan.description ?? ""} className="input" />
          </div>
          <div>
            <label className="label">Type</label>
            <select
              name="kind"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="input"
            >
              <option value="UNLIMITED">Unlimited (monthly)</option>
              <option value="PACK">Class pack</option>
              <option value="DROP_IN">Drop-in</option>
            </select>
          </div>
          <div>
            <label className="label">Price ($)</label>
            <input name="price" type="number" step="0.01" defaultValue={(plan.priceCents / 100).toFixed(2)} className="input" />
          </div>
          {!unlimited && (
            <div className="sm:col-span-2">
              <label className="label">Credits</label>
              <input name="credits" type="number" defaultValue={plan.credits} className="input" />
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-ink-400">
          {unlimited
            ? "Renews automatically each month on the member's sign-up date."
            : "Credits never expire."}
        </p>
        <div className="mt-3">
          <label className="label">Only for classes containing (optional)</label>
          <input
            name="restrictedClass"
            defaultValue={plan.restrictedClass ?? ""}
            className="input"
            placeholder="e.g. Mommy — blank for all classes"
          />
        </div>
        <div className="mt-3">
          <label className="label">Guest passes per month</label>
          <input
            name="guestPasses"
            type="number"
            min="0"
            defaultValue={plan.guestPassesPerMonth}
            className="input"
          />
        </div>
        <div className="mt-3 flex gap-2">
          <SaveBtn />
          <button type="button" onClick={() => setEditing(false)} className="btn-ghost text-xs">
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="card flex items-center gap-3 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{plan.name}</span>
          <span className="badge bg-ink-100 text-ink-600">{kindLabel[plan.kind]}</span>
        </div>
        <div className="text-xs text-ink-500">
          {money(plan.priceCents)} ·{" "}
          {plan.kind === "UNLIMITED"
            ? "renews monthly"
            : `${plan.credits} credits · never expires`}
          {plan.restrictedClass ? ` · ${plan.restrictedClass} classes only` : ""}
          {plan.guestPassesPerMonth > 0
            ? ` · ${plan.guestPassesPerMonth} guest pass${
                plan.guestPassesPerMonth === 1 ? "" : "es"
              }/mo`
            : ""}
          {plan.activeSales > 0 ? ` · ${plan.activeSales} active` : ""}
        </div>
      </div>
      <button
        onClick={toggleActive}
        disabled={pending}
        className={`badge ${plan.active ? "bg-green-100 text-green-700" : "bg-ink-100 text-ink-500"}`}
      >
        {plan.active ? "Visible" : "Hidden"}
      </button>
      <button onClick={() => setEditing(true)} className="btn-ghost text-xs">Edit</button>
      <button onClick={remove} disabled={pending} className="text-xs text-ink-400 hover:text-red-600">
        Delete
      </button>
    </div>
  );
}
