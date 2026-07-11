"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { staffAddEventRegistration } from "@/app/actions/events";
import { EVENT_SOURCES } from "@/lib/eventSources";

type M = { id: string; name: string };

export function AddEventRegistrationForm({
  eventId,
  members,
}: {
  eventId: string;
  members: M[];
}) {
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<string>(EVENT_SOURCES[0]);
  const [pending, start] = useTransition();
  const [addingId, setAddingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const guestForm = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return members.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 30);
  }, [members, search]);

  function addMember(m: M) {
    setMsg(null);
    setAddingId(m.id);
    start(async () => {
      const res = await staffAddEventRegistration(eventId, m.id, "", "", source);
      setAddingId(null);
      if (!res.ok) return setMsg({ ok: false, text: `${m.name}: ${res.error}` });
      setMsg({ ok: true, text: `${m.name} registered (${source}).` });
      setSearch("");
      router.refresh();
    });
  }

  function addGuest(formData: FormData) {
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    setMsg(null);
    start(async () => {
      const res = await staffAddEventRegistration(eventId, null, name, email, source);
      if (!res.ok) return setMsg({ ok: false, text: res.error ?? "Failed." });
      setMsg({ ok: true, text: `${name} registered (${source}).` });
      guestForm.current?.reset();
      router.refresh();
    });
  }

  return (
    <div className="card p-5">
      <h2 className="mb-1 font-semibold">Add a registration</h2>
      <p className="mb-3 text-sm text-ink-500">
        Register a member or a guest manually — no charge (for comps, cash, or
        walk-ins).
      </p>

      {msg && (
        <p
          className={`mb-3 text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}
        >
          {msg.text}
        </p>
      )}

      <div className="mb-3">
        <label className="label">Where they came from</label>
        <select
          className="input"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          {EVENT_SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <label className="label">Existing member</label>
      <input
        className="input"
        placeholder="Search members by name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {search.trim() && (
        <div className="mt-2 max-h-52 divide-y divide-ink-100 overflow-y-auto rounded-xl border border-ink-200">
          {shown.length === 0 ? (
            <p className="p-3 text-center text-sm text-ink-400">
              No members match &ldquo;{search}&rdquo;.
            </p>
          ) : (
            shown.map((m) => (
              <button
                key={m.id}
                type="button"
                disabled={pending}
                onClick={() => addMember(m)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ink-50 disabled:opacity-50"
              >
                <span className="font-medium">{m.name}</span>
                <span className="text-xs font-medium text-brand-600">
                  {addingId === m.id ? "Adding…" : "Register"}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      <div className="mt-4 border-t border-ink-100 pt-4">
        <label className="label">Or add a guest (not a member)</label>
        <form ref={guestForm} action={addGuest} className="flex flex-wrap gap-2">
          <input
            name="name"
            className="input flex-1"
            placeholder="Full name"
            required
          />
          <input
            name="email"
            type="email"
            className="input flex-1"
            placeholder="Email (optional)"
          />
          <button type="submit" className="btn-secondary" disabled={pending}>
            {pending ? "Adding…" : "Register guest"}
          </button>
        </form>
      </div>
    </div>
  );
}
