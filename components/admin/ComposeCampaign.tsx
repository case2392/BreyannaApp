"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { sendCampaign } from "@/app/actions/messaging";

type Audience = { key: string; label: string; count: number };

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
  emailReady,
  smsReady,
}: {
  audiences: Audience[];
  emailReady: boolean;
  smsReady: boolean;
}) {
  const [channel, setChannel] = useState<"EMAIL" | "SMS">("EMAIL");
  const [audience, setAudience] = useState(audiences[0]?.key ?? "all");
  const [body, setBody] = useState("");
  const [state, action] = useFormState(sendCampaign, {} as any);

  const count = audiences.find((a) => a.key === audience)?.count ?? 0;
  const providerReady = channel === "EMAIL" ? emailReady : smsReady;

  return (
    <form action={action} className="card p-5">
      <input type="hidden" name="channel" value={channel} />

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
          <label className="label">Audience</label>
          <select
            name="audience"
            className="input"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
          >
            {audiences.map((a) => (
              <option key={a.key} value={a.key}>
                {a.label} ({a.count})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink-500">
            This will reach{" "}
            <b>
              {count} member{count === 1 ? "" : "s"}
            </b>{" "}
            with {channel === "EMAIL" ? "an email address" : "a phone number"}.
          </p>
        </div>

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
