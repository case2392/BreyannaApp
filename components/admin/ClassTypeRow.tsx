"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { updateClassType, deleteClassType } from "@/app/actions/admin";

type ClassType = {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  capacity: number;
  creditCost: number;
  free: boolean;
  color: string;
  active: boolean;
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

export function ClassTypeRow({ ct }: { ct: ClassType }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const [state, action] = useFormState(
    async (prev: unknown, fd: FormData) => {
      const res = await updateClassType(prev, fd);
      if (res?.ok) setEditing(false);
      return res;
    },
    {} as { error?: string; ok?: boolean }
  );

  function remove() {
    if (!confirm(`Delete "${ct.name}"?`)) return;
    start(async () => {
      const res = await deleteClassType(ct.id);
      if (!res.ok) alert(res.error);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <form action={action} className="card p-4">
        <input type="hidden" name="id" value={ct.id} />
        {state?.error && (
          <p className="mb-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700">{state.error}</p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Name</label>
            <input name="name" defaultValue={ct.name} className="input" required />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Description</label>
            <input name="description" defaultValue={ct.description ?? ""} className="input" />
          </div>
          <div>
            <label className="label">Minutes</label>
            <input name="duration" type="number" defaultValue={ct.duration} className="input" />
          </div>
          <div>
            <label className="label">Capacity</label>
            <input name="capacity" type="number" defaultValue={ct.capacity} className="input" />
          </div>
          <div>
            <label className="label">Credits</label>
            <input name="creditCost" type="number" defaultValue={ct.creditCost} className="input" />
          </div>
          <div>
            <label className="label">Color</label>
            <input name="color" type="color" defaultValue={ct.color} className="h-10 w-16 rounded border border-ink-200" />
          </div>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" name="active" defaultChecked={ct.active} />
            <span className="text-sm text-ink-700">Show on the public site &amp; booking</span>
          </label>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" name="free" defaultChecked={ct.free} />
            <span className="text-sm text-ink-700">
              Free class — anyone can book without a membership or credits
            </span>
          </label>
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
      <span className="h-8 w-1.5 rounded-full" style={{ backgroundColor: ct.color }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{ct.name}</span>
          {ct.free && <span className="badge bg-sage-200 text-sage-700">Free</span>}
          {!ct.active && <span className="badge bg-ink-100 text-ink-500">Hidden</span>}
        </div>
        <div className="text-xs text-ink-500">
          {ct.duration} min ·{" "}
          {ct.free ? "free to enter" : `${ct.creditCost} credit${ct.creditCost === 1 ? "" : "s"}`}{" "}
          · {ct.sessions} sessions
        </div>
      </div>
      <button onClick={() => setEditing(true)} className="btn-ghost text-xs">Edit</button>
      <button onClick={remove} disabled={pending} className="text-xs text-ink-400 hover:text-red-600">
        Delete
      </button>
    </div>
  );
}
