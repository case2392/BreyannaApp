"use client";

import { useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  createClassType,
  createInstructor,
  createPlan,
  createRoom,
} from "@/app/actions/admin";

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

export function CreateClassTypeForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action] = useFormState(
    async (prev: unknown, fd: FormData) => {
      const res = await createClassType(prev, fd);
      if (res?.ok) ref.current?.reset();
      return res;
    },
    {} as { error?: string; ok?: boolean }
  );

  return (
    <form ref={ref} action={action} className="card p-5">
      <h3 className="mb-4 font-semibold">New class type</h3>
      <Err msg={state?.error} />
      <div className="space-y-3">
        <div>
          <label className="label">Name</label>
          <input name="name" className="input" placeholder="e.g. Vinyasa Yoga" required />
        </div>
        <div>
          <label className="label">Description</label>
          <input name="description" className="input" placeholder="Optional" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Minutes</label>
            <input name="duration" type="number" className="input" defaultValue={60} />
          </div>
          <div>
            <label className="label">Capacity</label>
            <input name="capacity" type="number" className="input" defaultValue={12} />
          </div>
          <div>
            <label className="label">Credits</label>
            <input name="creditCost" type="number" className="input" defaultValue={1} />
          </div>
        </div>
        <div>
          <label className="label">Color</label>
          <input name="color" type="color" className="h-10 w-16 rounded border border-ink-200" defaultValue="#ec4899" />
        </div>
      </div>
      <div className="mt-4">
        <Submit label="Add class type" />
      </div>
    </form>
  );
}

export function CreateInstructorForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action] = useFormState(
    async (prev: unknown, fd: FormData) => {
      const res = await createInstructor(prev, fd);
      if (res?.ok) ref.current?.reset();
      return res;
    },
    {} as { error?: string; ok?: boolean }
  );

  return (
    <form ref={ref} action={action} className="card p-5">
      <h3 className="mb-4 font-semibold">New instructor</h3>
      <Err msg={state?.error} />
      <div className="space-y-3">
        <div>
          <label className="label">Name</label>
          <input name="name" className="input" required />
        </div>
        <div>
          <label className="label">Bio</label>
          <input name="bio" className="input" placeholder="Optional" />
        </div>
      </div>
      <div className="mt-4">
        <Submit label="Add instructor" />
      </div>
    </form>
  );
}

export function CreateRoomForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action] = useFormState(
    async (prev: unknown, fd: FormData) => {
      const res = await createRoom(prev, fd);
      if (res?.ok) ref.current?.reset();
      return res;
    },
    {} as { error?: string; ok?: boolean }
  );

  return (
    <form ref={ref} action={action} className="card p-5">
      <h3 className="mb-4 font-semibold">New room</h3>
      <Err msg={state?.error} />
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="label">Room name</label>
          <input name="name" className="input" placeholder="e.g. Cycle Room" required />
        </div>
        <div>
          <label className="label">Capacity</label>
          <input name="capacity" type="number" className="input" defaultValue={12} />
        </div>
      </div>
      <div className="mt-4">
        <Submit label="Add room" />
      </div>
    </form>
  );
}

export function CreatePlanForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState("PACK");
  const [state, action] = useFormState(
    async (prev: unknown, fd: FormData) => {
      const res = await createPlan(prev, fd);
      if (res?.ok) {
        ref.current?.reset();
        setKind("PACK");
      }
      return res;
    },
    {} as { error?: string; ok?: boolean }
  );
  const unlimited = kind === "UNLIMITED";

  return (
    <form ref={ref} action={action} className="card p-5">
      <h3 className="mb-4 font-semibold">New plan</h3>
      <Err msg={state?.error} />
      <div className="space-y-3">
        <div>
          <label className="label">Name</label>
          <input name="name" className="input" placeholder="e.g. 10-Class Pack" required />
        </div>
        <div>
          <label className="label">Description</label>
          <input name="description" className="input" placeholder="Optional" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Type</label>
            <select
              name="kind"
              className="input"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              <option value="PACK">Class pack</option>
              <option value="UNLIMITED">Unlimited (monthly)</option>
              <option value="DROP_IN">Drop-in</option>
            </select>
          </div>
          <div>
            <label className="label">Price ($)</label>
            <input name="price" type="number" step="0.01" className="input" defaultValue={0} />
          </div>
          {unlimited ? (
            <div>
              <label className="label">Bills every (days)</label>
              <input name="durationDays" type="number" className="input" defaultValue={30} />
            </div>
          ) : (
            <div>
              <label className="label">Credits</label>
              <input name="credits" type="number" className="input" defaultValue={10} />
            </div>
          )}
        </div>
        {!unlimited && (
          <p className="text-xs text-ink-400">Credits never expire — they count down as classes are booked.</p>
        )}
      </div>
      <div className="mt-4">
        <Submit label="Add plan" />
      </div>
    </form>
  );
}
