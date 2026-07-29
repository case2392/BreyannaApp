"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buyEventTickets } from "@/app/actions/events";

type Person = { firstName: string; lastName: string; email: string };

export function EventTicketForm({
  eventId,
  priceCents,
  priceLabel,
  authed,
  selfRegistered,
  me,
}: {
  eventId: string;
  priceCents: number;
  priceLabel: string;
  authed: boolean;
  selfRegistered: boolean;
  me: Person | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Gift tickets (for people other than the buyer).
  const [gifts, setGifts] = useState<Person[]>([]);
  // Whether to include the buyer's own ticket (hidden if already registered).
  const [includeSelf, setIncludeSelf] = useState(!selfRegistered);

  if (!authed) {
    return (
      <div className="text-center">
        <a
          href={`/login?next=/events/${eventId}`}
          className="btn-primary block w-full"
        >
          Sign in to register
        </a>
        <p className="mt-3 text-xs text-ink-500">
          You&apos;ll sign in to register yourself or gift a ticket.
        </p>
      </div>
    );
  }

  const paid = priceCents > 0;
  const ticketCount = (includeSelf ? 1 : 0) + gifts.length;

  function setGift(i: number, field: keyof Person, value: string) {
    setGifts((g) => g.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  }
  function addGift() {
    setError(null);
    setGifts((g) => [...g, { firstName: "", lastName: "", email: "" }]);
  }
  function removeGift(i: number) {
    setGifts((g) => g.filter((_, idx) => idx !== i));
  }

  function submit() {
    setError(null);
    const attendees: (Person & { isBuyer: boolean })[] = [];
    if (includeSelf && me) attendees.push({ ...me, isBuyer: true });
    for (const g of gifts) attendees.push({ ...g, isBuyer: false });

    if (attendees.length === 0) {
      setError("Add at least one ticket.");
      return;
    }
    for (const a of attendees) {
      if (!a.firstName.trim() || !a.lastName.trim() || !a.email.trim()) {
        setError("Every ticket needs a first name, last name, and email.");
        return;
      }
    }

    start(async () => {
      const res = await buyEventTickets(eventId, attendees);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if ("url" in res && res.url) {
        window.location.href = res.url;
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      {selfRegistered && (
        <div className="mb-3 rounded-full bg-green-100 px-4 py-2 text-center text-sm font-semibold text-green-700">
          ✓ You&apos;re registered
        </div>
      )}

      {/* Your own ticket (only when not already registered) */}
      {!selfRegistered && me && (
        <label className="flex items-start gap-2 rounded-xl border border-ink-200 p-3 text-sm">
          <input
            type="checkbox"
            checked={includeSelf}
            onChange={(e) => setIncludeSelf(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium">A ticket for me</span>
            <span className="block text-xs text-ink-500">
              {me.firstName} {me.lastName}
            </span>
          </span>
        </label>
      )}

      {/* Gift tickets */}
      {gifts.length > 0 && (
        <div className="mt-3 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Gift tickets
          </div>
          {gifts.map((g, i) => (
            <div key={i} className="rounded-xl border border-ink-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-ink-500">
                  Guest {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeGift(i)}
                  className="text-xs text-ink-400 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="input"
                  placeholder="First name"
                  value={g.firstName}
                  onChange={(e) => setGift(i, "firstName", e.target.value)}
                />
                <input
                  className="input"
                  placeholder="Last name"
                  value={g.lastName}
                  onChange={(e) => setGift(i, "lastName", e.target.value)}
                />
              </div>
              <input
                className="input mt-2"
                type="email"
                placeholder="Email"
                value={g.email}
                onChange={(e) => setGift(i, "email", e.target.value)}
              />
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addGift}
        className="btn-ghost mt-3 w-full text-sm"
      >
        + Gift a ticket to someone
      </button>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={pending || ticketCount === 0}
        className="btn-primary mt-4 w-full"
      >
        {pending
          ? "…"
          : paid
          ? `Check out — ${ticketCount} × ${priceLabel}`
          : ticketCount > 0
          ? `Register ${ticketCount} ticket${ticketCount === 1 ? "" : "s"}`
          : "Register"}
      </button>
    </div>
  );
}
