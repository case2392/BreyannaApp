"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { updateInstructor, deleteInstructor } from "@/app/actions/admin";

type Instructor = {
  id: string;
  name: string;
  bio: string | null;
  sessions: number;
};

function SaveBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary text-xs" disabled={pending}>
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

export function InstructorRow({ instructor }: { instructor: Instructor }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const [state, action] = useFormState(
    async (prev: unknown, fd: FormData) => {
      const res = await updateInstructor(prev, fd);
      if (res?.ok) setEditing(false);
      return res;
    },
    {} as { error?: string; ok?: boolean }
  );

  function remove() {
    if (!confirm(`Remove "${instructor.name}"?`)) return;
    start(async () => {
      const res = await deleteInstructor(instructor.id);
      if (!res.ok) alert(res.error);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <form action={action} className="card p-4">
        <input type="hidden" name="id" value={instructor.id} />
        {state?.error && (
          <p className="mb-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700">{state.error}</p>
        )}
        <div className="space-y-2">
          <div>
            <label className="label">Name</label>
            <input name="name" defaultValue={instructor.name} className="input" required />
          </div>
          <div>
            <label className="label">Bio</label>
            <input name="bio" defaultValue={instructor.bio ?? ""} className="input" />
          </div>
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
        <div className="truncate font-medium">{instructor.name}</div>
        {instructor.bio && <div className="truncate text-xs text-ink-500">{instructor.bio}</div>}
        <div className="mt-0.5 text-xs text-ink-400">{instructor.sessions} sessions taught</div>
      </div>
      <button onClick={() => setEditing(true)} className="btn-ghost text-xs">Edit</button>
      <button onClick={remove} disabled={pending} className="text-xs text-ink-400 hover:text-red-600">
        Remove
      </button>
    </div>
  );
}
