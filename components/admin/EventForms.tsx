"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { createEvent, updateEvent, deleteEvent } from "@/app/actions/admin";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {msg}
    </p>
  );
}

// Shared field layout for create + edit.
function EventFields({
  defaults,
}: {
  defaults?: {
    name?: string;
    description?: string | null;
    location?: string | null;
    price?: string;
    date?: string;
    time?: string;
  };
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="label">Event name</label>
        <input
          name="name"
          className="input"
          placeholder="e.g. Craft Night"
          defaultValue={defaults?.name}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Date</label>
          <input name="date" type="date" className="input" defaultValue={defaults?.date} />
        </div>
        <div>
          <label className="label">Time</label>
          <input name="time" type="time" className="input" defaultValue={defaults?.time} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Location</label>
          <input
            name="location"
            className="input"
            placeholder="e.g. The Studio"
            defaultValue={defaults?.location ?? ""}
          />
        </div>
        <div>
          <label className="label">Price ($)</label>
          <input
            name="price"
            type="number"
            step="0.01"
            className="input"
            defaultValue={defaults?.price ?? "0"}
          />
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          name="description"
          className="input min-h-[80px]"
          placeholder="What the event is, what to bring, etc."
          defaultValue={defaults?.description ?? ""}
        />
      </div>
    </div>
  );
}

export function CreateEventForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action] = useFormState(
    async (prev: unknown, fd: FormData) => {
      const res = await createEvent(prev, fd);
      if (res?.ok) ref.current?.reset();
      return res;
    },
    {} as { error?: string; ok?: boolean }
  );

  return (
    <form ref={ref} action={action} className="card p-5">
      <h3 className="mb-4 font-semibold">New event</h3>
      <Err msg={state?.error} />
      <EventFields />
      <div className="mt-4">
        <Submit label="Create event" />
      </div>
    </form>
  );
}

type EventRowData = {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  priceCents: number;
  active: boolean;
  whenLabel: string;
  priceLabel: string;
  date: string;
  time: string;
  price: string;
};

export function EventRow({ event }: { event: EventRowData }) {
  const [editing, setEditing] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const router = useRouter();
  const [state, action] = useFormState(
    async (prev: unknown, fd: FormData) => {
      const res = await updateEvent(prev, fd);
      if (res?.ok) setEditing(false);
      return res;
    },
    {} as { error?: string; ok?: boolean }
  );

  function onDelete() {
    if (!confirm(`Delete "${event.name}"? This can't be undone.`)) return;
    startDelete(async () => {
      await deleteEvent(event.id);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <form action={action} className="card p-5">
        <input type="hidden" name="id" value={event.id} />
        <Err msg={state?.error} />
        <EventFields
          defaults={{
            name: event.name,
            description: event.description,
            location: event.location,
            price: event.price,
            date: event.date,
            time: event.time,
          }}
        />
        <label className="mt-3 flex items-center gap-2">
          <input type="checkbox" name="active" defaultChecked={event.active} />
          <span className="text-sm text-ink-700">Active (visible on lists)</span>
        </label>
        <div className="mt-4 flex gap-2">
          <Submit label="Save" />
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{event.name}</span>
            {!event.active && (
              <span className="badge bg-ink-100 text-ink-500">Hidden</span>
            )}
          </div>
          <div className="mt-0.5 text-sm text-ink-500">
            {event.whenLabel}
            {event.location ? ` · ${event.location}` : ""} · {event.priceLabel}
          </div>
          {event.description && (
            <p className="mt-2 text-sm text-ink-600">{event.description}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <button className="btn-ghost text-xs" onClick={() => setEditing(true)}>
            Edit
          </button>
          <button
            className="btn-ghost text-xs text-red-600 hover:bg-red-50"
            onClick={onDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
