"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createSession } from "@/app/actions/admin";
import { capacityLimited } from "@/lib/format";
import { studioNow } from "@/lib/time";

type Opt = { id: string; name: string };

const LOCATIONS = ["Studio", "Bottom Acre", "Deck/Backyard", "The Canvas", "The Ellery"];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Adding…" : "Add class"}
    </button>
  );
}

export function CreateSessionForm({
  classTypes,
  instructors,
}: {
  classTypes: Opt[];
  instructors: Opt[];
}) {
  const [state, action] = useFormState(createSession, {} as { error?: string; ok?: boolean });
  const [classTypeId, setClassTypeId] = useState(classTypes[0]?.id ?? "");
  // Default to the studio's Central "today", not the browser/UTC date.
  const today = studioNow().toISOString().slice(0, 10);

  const selected = classTypes.find((c) => c.id === classTypeId);
  const showCapacity = selected ? capacityLimited(selected.name) : false;

  return (
    <form action={action} className="card p-5">
      <h3 className="mb-4 font-semibold">Add a class to the schedule</h3>
      {state?.error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
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
          <select name="instructorId" className="input" required>
            {instructors.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Location</label>
          <select name="roomName" className="input">
            <option value="">— none —</option>
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
              placeholder="Number of spots"
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date</label>
            <input type="date" name="date" className="input" defaultValue={today} required />
          </div>
          <div>
            <label className="label">Time</label>
            <input type="time" name="time" className="input" defaultValue="18:00" required />
          </div>
        </div>
      </div>
      <div className="mt-4">
        <Submit />
      </div>
    </form>
  );
}
