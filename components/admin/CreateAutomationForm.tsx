"use client";

import { useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createAutomation } from "@/app/actions/messaging";

type TriggerDef = {
  key: string;
  label: string;
  defaultChannel: string;
  defaultSubject: string;
  defaultTemplate: string;
  vars: string[];
  supportsClassType: boolean;
};

type ClassType = { id: string; name: string };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary text-sm" disabled={pending}>
      {pending ? "Adding…" : "Add automation"}
    </button>
  );
}

export function CreateAutomationForm({
  triggers,
  classTypes,
}: {
  triggers: TriggerDef[];
  classTypes: ClassType[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [triggerKey, setTriggerKey] = useState(triggers[0]?.key ?? "");
  // Bump this to reset subject/template defaults when the trigger changes.
  const [resetTick, setResetTick] = useState(0);

  const def = useMemo(
    () => triggers.find((t) => t.key === triggerKey) ?? triggers[0],
    [triggers, triggerKey]
  );

  const [state, action] = useFormState(
    async (prev: unknown, fd: FormData) => {
      const res = await createAutomation(prev, fd);
      if (res?.ok) {
        formRef.current?.reset();
        setResetTick((t) => t + 1);
      }
      return res;
    },
    {} as { error?: string; ok?: boolean }
  );

  return (
    <form ref={formRef} action={action} className="card p-5">
      <h3 className="mb-1 font-semibold">Add an automation</h3>
      <p className="mb-4 text-sm text-ink-500">
        Create another version of a message — for example, a special booking
        confirmation just for one class type.
      </p>

      {state?.error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="grid gap-3">
        <div>
          <label className="label">When this happens</label>
          <select
            name="trigger"
            className="input"
            value={triggerKey}
            onChange={(e) => {
              setTriggerKey(e.target.value);
              setResetTick((t) => t + 1);
            }}
          >
            {triggers.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {def?.supportsClassType && (
          <div>
            <label className="label">For which classes</label>
            <select name="classTypeId" className="input" key={`ct-${resetTick}`}>
              <option value="">All classes (overrides the default)</option>
              {classTypes.map((c) => (
                <option key={c.id} value={c.id}>
                  Only {c.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-400">
              A class-specific version replaces the default for that class only.
            </p>
          </div>
        )}

        <div>
          <label className="label">Label (optional, for your reference)</label>
          <input
            name="name"
            className="input"
            placeholder="e.g. Mommy & Me booking note"
          />
        </div>

        <div>
          <label className="label">Send via</label>
          <select
            name="channel"
            className="input"
            key={`ch-${resetTick}`}
            defaultValue={def?.defaultChannel ?? "EMAIL"}
          >
            <option value="EMAIL">Email</option>
            <option value="SMS">Text (SMS)</option>
            <option value="BOTH">Email &amp; Text</option>
          </select>
        </div>

        <div>
          <label className="label">Email subject</label>
          <input
            name="subject"
            className="input"
            key={`sub-${resetTick}`}
            defaultValue={def?.defaultSubject ?? ""}
          />
        </div>

        <div>
          <label className="label">Message</label>
          <textarea
            name="template"
            className="input min-h-[90px]"
            key={`tpl-${resetTick}`}
            defaultValue={def?.defaultTemplate ?? ""}
          />
          <p className="mt-1 text-xs text-ink-400">
            Personalize with:{" "}
            {(def?.vars ?? []).map((v) => (
              <code key={v} className="mr-1 rounded bg-ink-100 px-1">{`{{${v}}}`}</code>
            ))}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <Submit />
      </div>
    </form>
  );
}
