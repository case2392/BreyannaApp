"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateSession } from "@/app/actions/admin";
import { capacityLimited } from "@/lib/format";

type Opt = { id: string; name: string };

const LOCATIONS = ["Studio", "Bottom Acre", "Deck/Backyard", "The Canvas", "The Ellery"];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary text-sm" disabled={pending}>
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}

export function EditSessionForm({
  sessionId,
  classTypes,
  instructors,
  current,
}: {
  sessionId: string;
  classTypes: Opt[];
  instructors: Opt[];
  current: {
    classTypeId: string;
    instructorId: string;
    roomName: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:MM
    capacity: number;
    isPrivate: boolean;
  };
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(updateSession, {} as { error?: string; ok?: boolean });
  const [classTypeId, setClassTypeId] = useState(current.classTypeId);

  const selected = classTypes.find((c) => c.id === classTypeId);
  const showCapacity = selected ? capacityLimited(selected.name) : false;

  // Close the modal on Escape for keyboard users.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary text-xs">
        Edit details
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-session-title"
    >
      <form
        action={action}
        className="card my-8 w-full max-w-lg p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 id="edit-session-title" className="font-semibold">Edit class details</h3>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm text-ink-400 hover:text-ink-600"
          >
            Close
          </button>
        </div>
      {state?.error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Saved ✓
        </p>
      )}
      <input type="hidden" name="sessionId" value={sessionId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Class</label>
          <select
            name="classTypeId"
            className="input"
            value={classTypeId}
            onChange={(e) => setClassTypeId(e.target.value)}
            required
          >
            {classTypes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Instructor</label>
          <select
            name="instructorId"
            className="input"
            defaultValue={current.instructorId}
            required
          >
            {instructors.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Location</label>
          <select name="roomName" className="input" defaultValue={current.roomName}>
            <option value="">— none —</option>
            {/* Include the current room even if it's not in the preset list. */}
            {current.roomName && !LOCATIONS.includes(current.roomName) && (
              <option value={current.roomName}>{current.roomName}</option>
            )}
            {LOCATIONS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        {showCapacity && (
          <div>
            <label className="label">Capacity (bikes)</label>
            <input
              name="capacity"
              type="number"
              min={1}
              className="input"
              defaultValue={current.capacity}
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              name="date"
              className="input"
              defaultValue={current.date}
              required
            />
          </div>
          <div>
            <label className="label">Time</label>
            <input
              type="time"
              name="time"
              className="input"
              defaultValue={current.time}
              required
            />
          </div>
        </div>
      </div>
        <label className="mt-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="isPrivate"
            defaultChecked={current.isPrivate}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium">Private (invite-only)</span>
            <span className="block text-xs text-ink-500">
              Hidden from the site and member schedule; bookable only via its
              invite link.
            </span>
          </span>
        </label>
        <div className="mt-4">
          <Submit />
        </div>
      </form>
    </div>
  );
}
