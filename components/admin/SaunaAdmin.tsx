"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import {
  addSaunaBlock,
  deleteSaunaBlock,
  saveSaunaSettingsForm,
  setSaunaBookingStatus,
  staffBookSauna,
  staffCancelSauna,
} from "@/app/actions/sauna";
import { DAY_NAMES, type SaunaSettings } from "@/lib/saunaShared";

function Submit({ label, pendingLabel = "Saving…" }: { label: string; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary text-sm">
      {pending ? pendingLabel : label}
    </button>
  );
}

function Num({
  name,
  label,
  defaultValue,
  min,
  max,
  suffix,
  hint,
}: {
  name: string;
  label: string;
  defaultValue: number;
  min: number;
  max: number;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={`sauna-${name}`}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={`sauna-${name}`}
          name={name}
          type="number"
          min={min}
          max={max}
          defaultValue={defaultValue}
          className="input w-24"
        />
        {suffix && <span className="text-sm text-ink-500">{suffix}</span>}
      </div>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

// ---- Settings ---------------------------------------------------------------

export function SaunaSettingsForm({ settings }: { settings: SaunaSettings }) {
  const [state, action] = useFormState(saveSaunaSettingsForm, {} as { ok?: boolean; error?: string });
  const [closed, setClosed] = useState(settings.hours.map((h) => h.closed));
  return (
    <form action={action} className="space-y-5">
      <label className="flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50 p-3">
        <input type="checkbox" name="enabled" defaultChecked={settings.enabled} className="mt-1" />
        <span>
          <span className="font-semibold text-ink-900">Sauna booking is on</span>
          <span className="block text-xs text-ink-600">
            Members see a “Sauna” tab in their account and can book times.
          </span>
        </span>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="sauna-name">
            Name members see
          </label>
          <input id="sauna-name" name="name" defaultValue={settings.name} className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="sauna-description">
            Short description
          </label>
          <textarea
            id="sauna-description"
            name="description"
            defaultValue={settings.description}
            className="input min-h-[70px]"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Num name="sessionMinutes" label="Session length" defaultValue={settings.sessionMinutes} min={10} max={180} suffix="min" />
        <Num
          name="bufferMinutes"
          label="Time between sessions"
          defaultValue={settings.bufferMinutes}
          min={0}
          max={120}
          suffix="min"
          hint="To wipe down, restock towels and reheat."
        />
        <Num
          name="maxPeople"
          label="People per booking"
          defaultValue={settings.maxPeople}
          min={1}
          max={4}
          hint="1 = just the member. Each guest uses a session."
        />
        <Num name="bookAheadDays" label="Book up to" defaultValue={settings.bookAheadDays} min={1} max={60} suffix="days ahead" />
        <Num name="minNoticeMinutes" label="Book at least" defaultValue={settings.minNoticeMinutes} min={0} max={1440} suffix="min ahead" />
        <Num
          name="cancelHours"
          label="Free cancellation"
          defaultValue={settings.cancelHours}
          min={0}
          max={72}
          suffix="hrs before"
          hint="Cancel later than this and the session isn't returned."
        />
        <Num
          name="dailyLimit"
          label="Sessions per member per day"
          defaultValue={settings.dailyLimit}
          min={0}
          max={10}
          hint="0 = no limit."
        />
      </div>

      <fieldset>
        <legend className="label">Sauna hours</legend>
        <div className="divide-y divide-ink-100 rounded-xl border border-ink-200">
          {DAY_NAMES.map((d, i) => (
            <div key={d} className="flex flex-wrap items-center gap-3 px-3 py-2">
              <span className="w-24 text-sm font-medium">{d}</span>
              <label className="flex items-center gap-1.5 text-xs text-ink-600">
                <input
                  type="checkbox"
                  name={`closed-${i}`}
                  checked={closed[i]}
                  onChange={(e) =>
                    setClosed((c) => c.map((v, j) => (j === i ? e.target.checked : v)))
                  }
                />
                Closed
              </label>
              {!closed[i] && (
                <span className="flex items-center gap-2 text-sm">
                  <input
                    type="time"
                    name={`open-${i}`}
                    defaultValue={settings.hours[i].open}
                    className="input w-32 px-2 py-1.5"
                    aria-label={`${d} opens`}
                  />
                  to
                  <input
                    type="time"
                    name={`close-${i}`}
                    defaultValue={settings.hours[i].close}
                    className="input w-32 px-2 py-1.5"
                    aria-label={`${d} closes`}
                  />
                </span>
              )}
            </div>
          ))}
        </div>
        <p className="mt-1 text-xs text-ink-500">
          Time slots are made automatically: session length + time between, starting
          at opening. The last session ends by closing time.
        </p>
      </fieldset>

      <div>
        <label className="label" htmlFor="sauna-guidelines">
          Safety guidelines (members agree once, before their first session)
        </label>
        <textarea
          id="sauna-guidelines"
          name="guidelines"
          defaultValue={settings.guidelines}
          className="input min-h-[150px] text-sm"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex items-center gap-3">
        <Submit label="Save sauna settings" />
        {state?.ok && <span className="text-sm text-green-700">Saved ✓</span>}
      </div>
    </form>
  );
}

// ---- Book for a member ------------------------------------------------------

export type AdminSlotDay = {
  day: string;
  label: string;
  slots: { start: string; label: string; open: boolean }[];
};

export function SaunaStaffBookForm({
  members,
  days,
  maxPeople,
}: {
  members: {
    id: string;
    name: string;
    credits: number;
    unlimited: boolean;
    included: string | null;
  }[];
  days: AdminSlotDay[];
  maxPeople: number;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [day, setDay] = useState(days.find((d) => d.slots.some((s) => s.open))?.day ?? days[0]?.day);
  const [memberId, setMemberId] = useState("");
  const [state, action] = useFormState(
    async (prev: unknown, fd: FormData) => {
      const res = await staffBookSauna(prev, fd);
      if ("ok" in res && res.ok) {
        ref.current?.reset();
        setMemberId("");
      }
      return res;
    },
    {} as { ok?: boolean; error?: string }
  );
  const current = days.find((d) => d.day === day);
  const m = members.find((x) => x.id === memberId);

  return (
    <form ref={ref} action={action} className="space-y-3">
      <div>
        <label className="label" htmlFor="sauna-book-member">
          Member
        </label>
        <select
          id="sauna-book-member"
          name="userId"
          className="input"
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          required
        >
          <option value="">Choose a member…</option>
          {members.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
              {x.unlimited
                ? " · Unlimited"
                : [x.included, x.credits > 0 ? `${x.credits} left` : null]
                    .filter(Boolean)
                    .map((t) => ` · ${t}`)
                    .join("")}
            </option>
          ))}
        </select>
        {m && !m.unlimited && !m.included && m.credits === 0 && (
          <p className="mt-1 text-xs text-amber-700">
            No sauna sessions on their account — tick “Complimentary” or add a plan
            to their profile first.
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="sauna-book-day">
            Day
          </label>
          <select
            id="sauna-book-day"
            className="input"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          >
            {days.map((d) => (
              <option key={d.day} value={d.day}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="sauna-book-time">
            Time
          </label>
          <select id="sauna-book-time" name="startsAt" className="input" required key={day}>
            <option value="">Choose…</option>
            {current?.slots.map((s) => (
              <option key={s.start} value={s.start} disabled={!s.open}>
                {s.label}
                {s.open ? "" : " (taken)"}
              </option>
            ))}
          </select>
        </div>
      </div>
      {maxPeople > 1 && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="sauna-book-people">
              People
            </label>
            <select id="sauna-book-people" name="people" className="input">
              {Array.from({ length: maxPeople }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="sauna-book-guests">
              Guest names
            </label>
            <input id="sauna-book-guests" name="guestNames" className="input" />
          </div>
        </div>
      )}
      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" name="comp" />
        Complimentary (doesn&apos;t use a session)
      </label>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-700">Booked ✓ — they&apos;ve been emailed.</p>}
      <Submit label="Book sauna" pendingLabel="Booking…" />
    </form>
  );
}

// ---- Block time ---------------------------------------------------------------

export function SaunaBlockForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [allDay, setAllDay] = useState(true);
  const [state, action] = useFormState(
    async (prev: unknown, fd: FormData) => {
      const res = await addSaunaBlock(prev, fd);
      if ("ok" in res && res.ok) ref.current?.reset();
      return res;
    },
    {} as { ok?: boolean; error?: string }
  );
  return (
    <form ref={ref} action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="sauna-block-date">
            Date
          </label>
          <input id="sauna-block-date" name="date" type="date" className="input" required />
        </div>
        <label className="mt-6 flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            name="allDay"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
          />
          All day
        </label>
      </div>
      {!allDay && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="sauna-block-from">
              From
            </label>
            <input id="sauna-block-from" name="from" type="time" className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="sauna-block-to">
              To
            </label>
            <input id="sauna-block-to" name="to" type="time" className="input" required />
          </div>
        </div>
      )}
      <div>
        <label className="label" htmlFor="sauna-block-reason">
          Reason (just for staff)
        </label>
        <input
          id="sauna-block-reason"
          name="reason"
          className="input"
          placeholder="e.g. Maintenance, holiday, private event"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Submit label="Block this time" />
    </form>
  );
}

export function DeleteBlockButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-xs font-medium text-ink-500 hover:text-red-600"
      onClick={() =>
        start(async () => {
          await deleteSaunaBlock(id);
          router.refresh();
        })
      }
    >
      {pending ? "…" : "Remove"}
    </button>
  );
}

// ---- Per-booking actions ------------------------------------------------------

export function SaunaBookingActions({
  id,
  status,
  past,
  usesSession,
}: {
  id: string;
  status: string;
  past: boolean;
  usesSession: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {past || status !== "BOOKED" ? (
        <>
          {(["ATTENDED", "NO_SHOW"] as const).map((s) => (
            <button
              key={s}
              type="button"
              disabled={pending}
              onClick={() => run(() => setSaunaBookingStatus(id, status === s ? "BOOKED" : s))}
              className={`badge ${
                status === s
                  ? s === "ATTENDED"
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-800"
                  : "bg-ink-100 text-ink-500 hover:bg-ink-200"
              }`}
            >
              {s === "ATTENDED" ? "Came ✓" : "No-show"}
            </button>
          ))}
        </>
      ) : null}
      {status === "BOOKED" && (
        <button
          type="button"
          disabled={pending}
          className="text-xs font-medium text-ink-500 hover:text-red-600"
          onClick={() => {
            if (!confirm("Cancel this sauna booking?")) return;
            const refund = usesSession
              ? confirm("Give the member their session back?\n\nOK = yes, return it · Cancel = no")
              : false;
            run(() => staffCancelSauna(id, refund));
          }}
        >
          Cancel
        </button>
      )}
    </div>
  );
}
