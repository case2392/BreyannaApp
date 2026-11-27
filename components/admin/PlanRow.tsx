"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { updatePlan, deletePlan, togglePlan } from "@/app/actions/admin";
import { money } from "@/lib/format";
import { SaleFields, type SaleDefaults } from "@/components/admin/SaleFields";
import { PlanCategoryPicker, kindOptions } from "@/components/admin/PlanCategoryPicker";
import {
  ClassAccessChecklist,
  type ClassAccessOpt,
} from "@/components/admin/ClassAccessChecklist";

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
  category: string;
  credits: number;
  priceCents: number;
  durationDays: number;
  active: boolean;
  activeSales: number;
  restrictedClass: string | null;
  guestPassesPerMonth: number;
  sale: SaleDefaults;
  // e.g. "On sale: $99 through Sun, Nov 30" / "Sale scheduled…" / "Sale ended…"
  saleSummary: { tone: "live" | "scheduled" | "ended"; text: string } | null;
};

function SaveBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary text-xs" disabled={pending}>
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

export function PlanRow({
  plan,
  classTypes = [],
}: {
  plan: Plan;
  classTypes?: ClassAccessOpt[];
}) {
  const [editing, setEditing] = useState(false);
  const [kind, setKind] = useState(plan.kind);
  const [category, setCategory] = useState(plan.category);
  const sauna = category === "SAUNA";
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
        <div className="mb-3">
          <PlanCategoryPicker value={category} onChange={setCategory} />
        </div>
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
              {kindOptions(category).map((o) => (
                <option key={o.v} value={o.v}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Price ($)</label>
            <input name="price" type="number" step="0.01" defaultValue={(plan.priceCents / 100).toFixed(2)} className="input" />
          </div>
          {!unlimited && (
            <div className="sm:col-span-2">
              <label className="label">{sauna ? "Sessions" : "Credits"}</label>
              <input name="credits" type="number" defaultValue={plan.credits} className="input" />
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-ink-400">
          {unlimited
            ? "Renews automatically each month on the member's sign-up date."
            : "Credits never expire."}
        </p>
        {!sauna && (
        <>
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
          <label className="label">
            {unlimited ? "Guest passes per month" : "Guest passes with this pass"}
          </label>
          <input
            name="guestPasses"
            type="number"
            min="0"
            defaultValue={plan.guestPassesPerMonth}
            className="input"
          />
          <p className="mt-1 text-xs text-ink-400">
            {unlimited
              ? "Given each month; reset on renewal."
              : "Comes with the pass and stays until used, like class credits."}
          </p>
        </div>
        </>
        )}
        <div className="mt-3">
          <SaleFields idPrefix={`plan-${plan.id}`} defaults={plan.sale} monthly={unlimited} />
        </div>
        {!sauna && (
          <div className="mt-3">
            <ClassAccessChecklist classTypes={classTypes} planId={plan.id} />
          </div>
        )}
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
          {plan.category === "SAUNA" && (
            <span className="badge bg-clay-100 text-ink-700">Sauna</span>
          )}
          <span className="badge bg-ink-100 text-ink-600">
            {plan.category === "SAUNA"
              ? { UNLIMITED: "Unlimited", PACK: "Session pack", DROP_IN: "Single session" }[plan.kind]
              : kindLabel[plan.kind]}
          </span>
        </div>
        {plan.saleSummary && (
          <div
            className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
              plan.saleSummary.tone === "live"
                ? "bg-clay-300 text-ink-900"
                : plan.saleSummary.tone === "scheduled"
                ? "bg-brand-50 text-brand-700"
                : "bg-ink-100 text-ink-500"
            }`}
          >
            {plan.saleSummary.text}
          </div>
        )}
        <div className="text-xs text-ink-500">
          {money(plan.priceCents)} ·{" "}
          {plan.kind === "UNLIMITED"
            ? "renews monthly"
            : `${plan.credits} ${plan.category === "SAUNA" ? "session" : "credit"}${plan.credits === 1 ? "" : "s"} · never expires`}
          {plan.restrictedClass ? ` · ${plan.restrictedClass} classes only` : ""}
          {plan.guestPassesPerMonth > 0
            ? ` · ${plan.guestPassesPerMonth} guest pass${
                plan.guestPassesPerMonth === 1 ? "" : "es"
              }${unlimited ? "/mo" : ""}`
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
