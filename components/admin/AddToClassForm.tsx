"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { staffAddToClass } from "@/app/actions/admin";

type M = { id: string; name: string };

export function AddToClassForm({
  sessionId,
  members,
}: {
  sessionId: string;
  members: M[];
}) {
  const [search, setSearch] = useState("");
  const [comp, setComp] = useState(false);
  const [pending, start] = useTransition();
  const [addingId, setAddingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return members.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 30);
  }, [members, search]);

  function add(m: M) {
    setMsg(null);
    setAddingId(m.id);
    start(async () => {
      const res = await staffAddToClass(sessionId, m.id, comp);
      setAddingId(null);
      if (!res.ok) {
        setMsg({ ok: false, text: `${m.name}: ${res.error}` });
        return;
      }
      setMsg({
        ok: true,
        text: `${m.name} ${
          res.status === "WAITLISTED" ? "added to the waitlist" : "added"
        }${comp ? " (comp — no credit used)" : ""}.`,
      });
      setSearch("");
      router.refresh();
    });
  }

  return (
    <div className="card p-5">
      <h2 className="mb-1 font-semibold">Add a member</h2>
      <p className="mb-3 text-sm text-ink-500">
        Books them into this class, using their credits like a normal booking.
      </p>
      <label className="mb-3 flex items-center gap-2 text-sm text-ink-700">
        <input
          type="checkbox"
          checked={comp}
          onChange={(e) => setComp(e.target.checked)}
        />
        Add without using credits (comp)
      </label>
      <input
        className="input"
        placeholder="Search members by name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {msg && (
        <p
          className={`mt-2 text-sm ${
            msg.ok ? "text-green-700" : "text-red-600"
          }`}
        >
          {msg.text}
        </p>
      )}
      {search.trim() && (
        <div className="mt-2 max-h-56 divide-y divide-ink-100 overflow-y-auto rounded-xl border border-ink-200">
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
                onClick={() => add(m)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ink-50 disabled:opacity-50"
              >
                <span className="font-medium">{m.name}</span>
                <span className="text-xs font-medium text-brand-600">
                  {addingId === m.id ? "Adding…" : "Add"}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
