"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ContactExport } from "@/components/admin/ContactExport";
import { formatPhone } from "@/lib/phone";

export type MemberRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  plans: string[]; // active plan names
  pastDue: boolean;
  renews: string | null;
  lastSeen: string;
  joined: string;
  bookings: number;
};

const digits = (s: string) => s.replace(/\D/g, "");

// Members list with instant search (name, email, phone, plan) and a
// membership-type filter. Copy/Download act on the members shown.
export function MembersTable({ members }: { members: MemberRow[] }) {
  const [q, setQ] = useState("");
  const [plan, setPlan] = useState("ALL");

  // Remember the search in the address bar so Back returns to it.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setQ(p.get("q") ?? "");
    setPlan(p.get("plan") ?? "ALL");
  }, []);
  useEffect(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (plan !== "ALL") p.set("plan", plan);
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [q, plan]);

  const planNames = useMemo(
    () => Array.from(new Set(members.flatMap((m) => m.plans))).sort(),
    [members]
  );

  const shown = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const qDigits = digits(q);
    return members.filter((m) => {
      if (plan === "ANY" && m.plans.length === 0) return false;
      if (plan === "NONE" && (m.plans.length > 0 || m.pastDue)) return false;
      if (plan === "PAST_DUE" && !m.pastDue) return false;
      if (!["ALL", "ANY", "NONE", "PAST_DUE"].includes(plan) && !m.plans.includes(plan))
        return false;
      if (words.length === 0) return true;
      // A phone search: 3+ digits anywhere in their number.
      if (qDigits.length >= 3 && words.every((w) => /^[\d()+.\-]+$/.test(w)))
        return digits(m.phone ?? "").includes(qDigits);
      const hay = `${m.firstName} ${m.lastName} ${m.email} ${m.phone ?? ""} ${m.plans.join(" ")}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [members, q, plan]);

  const filtered = q.trim() !== "" || plan !== "ALL";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[14rem] flex-1">
          <label className="label" htmlFor="member-search">
            Search members
          </label>
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
            </span>
            <input
              id="member-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, email, phone or plan"
              className="input pl-9"
              autoComplete="off"
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="member-plan">
            Membership type
          </label>
          <select
            id="member-plan"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="input"
          >
            <option value="ALL">Everyone</option>
            <option value="ANY">Any active plan</option>
            <option value="NONE">No plan</option>
            <option value="PAST_DUE">Payment failed</option>
            {planNames.length > 0 && (
              <optgroup label="Plan">
                {planNames.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
        {filtered && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setPlan("ALL");
            }}
            className="btn-ghost text-sm"
          >
            Clear
          </button>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-500" aria-live="polite">
          {filtered
            ? `Showing ${shown.length} of ${members.length} members`
            : `${members.length} members`}
        </p>
        <ContactExport
          contacts={shown.map((m) => ({
            firstName: m.firstName,
            lastName: m.lastName,
            email: m.email,
            phone: m.phone,
          }))}
          fileLabel={plan !== "ALL" && !["ANY", "NONE", "PAST_DUE"].includes(plan)
            ? plan.toLowerCase().replace(/[^a-z0-9]+/g, "-")
            : "members"}
        />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[28rem] text-sm">
          <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="hidden px-4 py-3 sm:table-cell">Membership</th>
              <th className="hidden px-4 py-3 lg:table-cell">Last seen</th>
              <th className="hidden px-4 py-3 md:table-cell">Joined</th>
              <th className="px-4 py-3 text-right">Bookings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {shown.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-500">
                  No members match{q ? ` “${q}”` : ""}.
                </td>
              </tr>
            )}
            {shown.map((m) => (
              <tr key={m.id} className="hover:bg-ink-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/members/${m.id}`}
                    className="font-medium text-ink-900 hover:text-brand-600"
                  >
                    {m.firstName} {m.lastName}
                  </Link>
                  <div className="text-xs text-ink-500">{m.email}</div>
                  {m.phone && <div className="text-xs text-ink-500">{formatPhone(m.phone)}</div>}
                  {/* Plans on small screens (the column is hidden). */}
                  {m.plans.length > 0 && (
                    <div className="mt-1 text-xs font-medium text-green-700 sm:hidden">
                      {m.plans.join(" · ")}
                    </div>
                  )}
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {m.plans.map((p) => (
                      <span key={p} className="badge bg-green-100 text-green-700">
                        {p}
                      </span>
                    ))}
                    {m.pastDue && (
                      <span className="badge bg-amber-100 text-amber-800">Payment failed</span>
                    )}
                    {m.plans.length === 0 && !m.pastDue && (
                      <span className="badge bg-ink-100 text-ink-500">None</span>
                    )}
                  </div>
                  {m.renews && (
                    <div className="mt-1 text-[11px] text-ink-400">Renews {m.renews}</div>
                  )}
                </td>
                <td className="hidden px-4 py-3 text-ink-500 lg:table-cell">{m.lastSeen}</td>
                <td className="hidden px-4 py-3 text-ink-500 md:table-cell">{m.joined}</td>
                <td className="px-4 py-3 text-right font-medium">{m.bookings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
