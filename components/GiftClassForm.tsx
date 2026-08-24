"use client";

import { useState, useTransition } from "react";
import { giftClassCheckout } from "@/app/actions/gift";

export function GiftClassForm({
  classes,
  priceLabel,
}: {
  classes: { id: string; label: string }[];
  priceLabel: string;
}) {
  const [sessionId, setSessionId] = useState(classes[0]?.id ?? "");
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    if (!sessionId) {
      setError("Pick a class to gift.");
      return;
    }
    start(async () => {
      const res = await giftClassCheckout(sessionId, {
        firstName,
        lastName,
        email,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if ("url" in res && res.url) window.location.href = res.url;
    });
  }

  if (classes.length === 0) {
    return (
      <div className="card p-6 text-center text-ink-500">
        No upcoming classes to gift right now. Check back soon!
      </div>
    );
  }

  return (
    <div className="card space-y-4 p-6">
      <div>
        <label className="label" htmlFor="gift-class">Which class?</label>
        <select
          id="gift-class"
          className="input"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Who's it for?</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            className="input"
            placeholder="First name"
            aria-label="Recipient first name"
            value={firstName}
            onChange={(e) => setFirst(e.target.value)}
          />
          <input
            className="input"
            placeholder="Last name"
            aria-label="Recipient last name"
            value={lastName}
            onChange={(e) => setLast(e.target.value)}
          />
        </div>
        <input
          className="input mt-2"
          type="email"
          placeholder="Their email"
          aria-label="Recipient email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={submit}
        disabled={pending}
        className="btn-primary w-full"
      >
        {pending ? "…" : `Gift this class — ${priceLabel}`}
      </button>
      <p className="text-center text-xs text-ink-400">
        You&apos;ll pay the single-class rate. We&apos;ll add them to the
        roster; let them know so they can come.
      </p>
    </div>
  );
}
