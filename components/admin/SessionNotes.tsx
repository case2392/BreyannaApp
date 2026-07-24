"use client";

import { useState, useTransition } from "react";
import { saveSessionNotes } from "@/app/actions/admin";

export function SessionNotes({
  sessionId,
  initial,
}: {
  sessionId: string;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function save() {
    setSaved(false);
    start(async () => {
      await saveSessionNotes(sessionId, value);
      setSaved(true);
    });
  }

  return (
    <div>
      <textarea
        className="input min-h-[90px]"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        placeholder="e.g. Jane texted she couldn't make it · ran 5 min late · great turnout"
      />
      <div className="mt-2 flex items-center gap-3">
        <button onClick={save} disabled={pending} className="btn-primary text-xs">
          {pending ? "Saving…" : "Save notes"}
        </button>
        {saved && <span className="text-xs text-green-600">Saved ✓</span>}
      </div>
    </div>
  );
}
