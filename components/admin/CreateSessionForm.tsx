"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createSession } from "@/app/actions/admin";

type Opt = { id: string; name: string };

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
  rooms,
}: {
  classTypes: Opt[];
  instructors: Opt[];
  rooms: Opt[];
}) {
  const [state, action] = useFormState(createSession, {} as { error?: string; ok?: boolean });
  const today = new Date().toISOString().slice(0, 10);

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
          <select name="classTypeId" className="input" required>
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
          <label className="label">Room</label>
          <select name="roomId" className="input">
            <option value="">— none —</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
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
