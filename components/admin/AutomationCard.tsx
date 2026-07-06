"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { saveAutomation, deleteAutomation } from "@/app/actions/messaging";

type Props = {
  apiKey: string;
  scopeLabel: string;
  vars: string[];
  enabled: boolean;
  channel: string;
  subject: string;
  template: string;
  canDelete: boolean;
};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary text-xs" disabled={pending}>
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

export function AutomationCard(p: Props) {
  const [enabled, setEnabled] = useState(p.enabled);
  const [state, action] = useFormState(saveAutomation, {} as any);
  const [isDeleting, startDelete] = useTransition();
  const router = useRouter();

  function onDelete() {
    if (!confirm("Delete this automation? This can't be undone.")) return;
    startDelete(async () => {
      await deleteAutomation(p.apiKey);
      router.refresh();
    });
  }

  return (
    <form action={action} className="card p-5">
      <input type="hidden" name="key" value={p.apiKey} />

      <div className="flex items-start justify-between gap-3">
        <span className="badge bg-brand-50 text-brand-700">{p.scopeLabel}</span>
        {/* Toggle */}
        <label className="relative inline-flex shrink-0 cursor-pointer items-center">
          <input
            type="checkbox"
            name="enabled"
            className="peer sr-only"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span className="h-6 w-11 rounded-full bg-ink-200 transition peer-checked:bg-brand-500" />
          <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5" />
        </label>
      </div>

      <div className="mt-4 grid gap-3">
        <div>
          <label className="label">Send via</label>
          <select name="channel" defaultValue={p.channel} className="input">
            <option value="EMAIL">Email</option>
            <option value="SMS">Text (SMS)</option>
            <option value="BOTH">Email &amp; Text</option>
          </select>
        </div>
        <div>
          <label className="label">Email subject</label>
          <input name="subject" defaultValue={p.subject} className="input" />
        </div>
        <div>
          <label className="label">Message</label>
          <textarea
            name="template"
            defaultValue={p.template}
            className="input min-h-[90px]"
          />
          <p className="mt-1 text-xs text-ink-400">
            Personalize with:{" "}
            {p.vars.map((v) => (
              <code key={v} className="mr-1 rounded bg-ink-100 px-1">{`{{${v}}}`}</code>
            ))}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <SaveButton />
        {p.canDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="btn-ghost text-xs text-red-600 hover:bg-red-50"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        )}
        {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
        {state?.ok && <span className="text-xs text-green-600">Saved ✓</span>}
      </div>
    </form>
  );
}
