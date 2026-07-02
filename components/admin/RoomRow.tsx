"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { updateRoom, deleteRoom } from "@/app/actions/admin";

type Room = { id: string; name: string; capacity: number; sessions: number };

function SaveBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary text-xs" disabled={pending}>
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

export function RoomRow({ room }: { room: Room }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const [state, action] = useFormState(
    async (prev: unknown, fd: FormData) => {
      const res = await updateRoom(prev, fd);
      if (res?.ok) setEditing(false);
      return res;
    },
    {} as { error?: string; ok?: boolean }
  );

  function remove() {
    if (!confirm(`Remove "${room.name}"?`)) return;
    start(async () => {
      const res = await deleteRoom(room.id);
      if (!res.ok) alert(res.error);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <form action={action} className="card p-4">
        <input type="hidden" name="id" value={room.id} />
        {state?.error && (
          <p className="mb-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700">{state.error}</p>
        )}
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label className="label">Room name</label>
            <input name="name" defaultValue={room.name} className="input" required />
          </div>
          <div>
            <label className="label">Capacity</label>
            <input name="capacity" type="number" defaultValue={room.capacity} className="input" />
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
        <div className="truncate font-medium">{room.name}</div>
        <div className="text-xs text-ink-500">Capacity {room.capacity}</div>
      </div>
      <button onClick={() => setEditing(true)} className="btn-ghost text-xs">Edit</button>
      <button onClick={remove} disabled={pending} className="text-xs text-ink-400 hover:text-red-600">
        Remove
      </button>
    </div>
  );
}
