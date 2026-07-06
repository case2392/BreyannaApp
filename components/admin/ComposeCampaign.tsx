"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { sendCampaign } from "@/app/actions/messaging";

type Audience = { key: string; label: string; count: number };
type Member = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
};

function SendButton({ channel }: { channel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Sending…" : channel === "EMAIL" ? "Send email" : "Send text"}
    </button>
  );
}

export function ComposeCampaign({
  audiences,
  members,
  emailReady,
  smsReady,
}: {
  audiences: Audience[];
  members: Member[];
  emailReady: boolean;
  smsReady: boolean;
}) {
  const [channel, setChannel] = useState<"EMAIL" | "SMS">("EMAIL");
  const [audience, setAudience] = useState(audiences[0]?.key ?? "all");
  const [body, setBody] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [state, action] = useFormState(sendCampaign, {} as any);

  const isCustom = audience === "custom";
  const providerReady = channel === "EMAIL" ? emailReady : smsReady;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      `${m.firstName} ${m.lastName} ${m.email} ${m.phone ?? ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [members, search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // How many people this send will actually reach on the chosen channel.
  const reachableCount = isCustom
    ? members.filter(
        (m) =>
          selected.has(m.id) && (channel === "EMAIL" ? Boolean(m.email) : Boolean(m.phone))
      ).length
    : audiences.find((a) => a.key === audience)?.count ?? 0;

  return (
    <form action={action} className="card p-5">
      <input type="hidden" name="channel" value={channel} />
      {isCustom && (
        <input type="hidden" name="memberIds" value={[...selected].join(",")} />
      )}

      {/* Channel toggle */}
      <div className="mb-4 inline-flex rounded-xl border border-ink-200 bg-ink-50 p-1">
        {(["EMAIL", "SMS"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setChannel(c)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              channel === c ? "bg-white text-ink-900 shadow-soft" : "text-ink-500"
            }`}
          >
            {c === "EMAIL" ? "Email" : "Text (SMS)"}
          </button>
        ))}
      </div>

      {!providerReady && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Demo mode — no {channel === "EMAIL" ? "email" : "SMS"} provider key is
          set, so messages are logged but not actually delivered. Add{" "}
          {channel === "EMAIL" ? "a Resend" : "Twilio"} key to send for real.
        </p>
      )}

      {state?.error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {state.simulated ? "Simulated " : "Sent "}
          {state.sent} message{state.sent === 1 ? "" : "s"}
          {state.failed > 0 ? ` · ${state.failed} failed` : ""}.
        </p>
      )}

      <div className="space-y-3">
        <div>
          <label className="label">Send to</label>
          <select
            name="audience"
            className="input"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
          >
            <option value="custom">Choose specific people…</option>
            {audiences.map((a) => (
              <option key={a.key} value={a.key}>
                {a.label} ({a.count})
              </option>
            ))}
          </select>
          {!isCustom && (
            <p className="mt-1 text-xs text-ink-500">
              This will reach{" "}
              <b>
                {reachableCount} member{reachableCount === 1 ? "" : "s"}
              </b>{" "}
              with {channel === "EMAIL" ? "an email address" : "a phone number"}.
            </p>
          )}
        </div>

        {/* Hand-picked people */}
        {isCustom && (
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <input
                type="text"
                className="input"
                placeholder="Search members by name, email, or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-ink-500">
                <b className="text-ink-800">{selected.size}</b> selected ·{" "}
                {reachableCount} reachable by{" "}
                {channel === "EMAIL" ? "email" : "text"}
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="font-medium text-brand-600 hover:underline"
                  onClick={() =>
                    setSelected((prev) => {
                      const next = new Set(prev);
                      filtered.forEach((m) => next.add(m.id));
                      return next;
                    })
                  }
                >
                  Select all shown
                </button>
                <button
                  type="button"
                  className="font-medium text-ink-500 hover:underline"
                  onClick={() => setSelected(new Set())}
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="max-h-64 divide-y divide-ink-100 overflow-y-auto rounded-xl border border-ink-200">
              {filtered.length === 0 ? (
                <p className="p-4 text-center text-sm text-ink-400">
                  No members match &ldquo;{search}&rdquo;.
                </p>
              ) : (
                filtered.map((m) => {
                  const missing =
                    channel === "EMAIL" ? !m.email : !m.phone;
                  return (
                    <label
                      key={m.id}
                      className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-ink-50"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={selected.has(m.id)}
                        onChange={() => toggle(m.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {m.firstName} {m.lastName}
                        </span>
                        <span className="block truncate text-xs text-ink-500">
                          {channel === "EMAIL"
                            ? m.email || "— no email —"
                            : m.phone || "— no phone —"}
                        </span>
                      </span>
                      {missing && (
                        <span className="badge bg-amber-100 text-amber-700">
                          no {channel === "EMAIL" ? "email" : "phone"}
                        </span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
            <p className="mt-1 text-xs text-ink-400">
              One message, delivered individually to each person you pick.
            </p>
          </div>
        )}

        {channel === "EMAIL" && (
          <div>
            <label className="label">Subject</label>
            <input name="subject" className="input" placeholder="Subject line" />
          </div>
        )}

        <div>
          <label className="label">Message</label>
          <textarea
            name="body"
            className="input min-h-[140px]"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              channel === "EMAIL"
                ? "Write your email…"
                : "Write your text message…"
            }
          />
          {channel === "SMS" && (
            <p className="mt-1 text-xs text-ink-400">{body.length} characters</p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <SendButton channel={channel} />
      </div>
    </form>
  );
}
