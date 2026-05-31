"use client";

import { useState, useTransition } from "react";
import { saveMemberNotes } from "@/app/actions/admin";

export function MemberNotes({
  userId,
  initial,
}: {
  userId: string;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function save() {
    setSaved(false);
    start(async () => {
      await saveMemberNotes(userId, value);
      setSaved(true);
    });
  }

  return (
    <div>
      <textarea
        className="input min-h-[110px]"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        placeholder="Health notes, injuries, preferences, payment reminders…"
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
