"use client";

import { useState, useTransition } from "react";
import { startDonation } from "@/app/actions/sponsor";

type GiftChoice = "RECIPIENT" | "ANONYMOUS" | null;

const PRESETS = [25, 50, 100, 150];

export function DonateForm() {
  const [amount, setAmount] = useState<number>(50);
  const [custom, setCustom] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [giftFor, setGiftFor] = useState<GiftChoice>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const effective = custom ? parseFloat(custom) : amount;

  function donate() {
    setError(null);
    if (!giftFor) {
      setError("Please choose who this gift is for.");
      return;
    }
    if (giftFor === "RECIPIENT" && (!firstName.trim() || !lastName.trim() || !phone.trim())) {
      setError("Please enter her first name, last name, and phone number.");
      return;
    }
    start(async () => {
      const res = await startDonation(
        effective,
        recurring,
        giftFor === "RECIPIENT"
          ? { type: "RECIPIENT", firstName, lastName, phone }
          : { type: "ANONYMOUS" }
      );
      if (res.ok && res.url) window.location.href = res.url;
      else setError(res.error ?? "Something went wrong.");
    });
  }

  return (
    <div className="card p-6">
      {/* Frequency */}
      <div className="mb-5 inline-flex rounded-xl border border-ink-200 bg-ink-50 p-1">
        {[
          { v: false, label: "One-time" },
          { v: true, label: "Monthly" },
        ].map((o) => (
          <button
            key={o.label}
            type="button"
            onClick={() => setRecurring(o.v)}
            className={`rounded-lg px-5 py-1.5 text-sm font-medium transition ${
              recurring === o.v ? "bg-white text-ink-900 shadow-soft" : "text-ink-500"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Preset amounts */}
      <div className="grid grid-cols-4 gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setAmount(p);
              setCustom("");
            }}
            className={`rounded-xl border py-3 text-sm font-semibold transition ${
              !custom && amount === p
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-ink-200 text-ink-700 hover:bg-ink-50"
            }`}
          >
            ${p}
          </button>
        ))}
      </div>

      {/* Custom amount */}
      <div className="mt-3">
        <label className="label">Or enter an amount</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">$</span>
          <input
            type="number"
            min={1}
            step="1"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Custom amount"
            className="input pl-7"
          />
        </div>
      </div>

      {/* Who is this gift for? */}
      <fieldset className="mt-5">
        <legend className="label">Who is this gift for?</legend>
        <div className="space-y-2">
          {[
            {
              v: "RECIPIENT" as const,
              label: "I have someone I\u2019d like to sponsor or gift this to",
            },
            { v: "ANONYMOUS" as const, label: "Anonymous sponsorship gift" },
          ].map((o) => (
            <label
              key={o.v}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ${
                giftFor === o.v
                  ? "border-brand-500 bg-brand-50"
                  : "border-ink-200 hover:bg-ink-50"
              }`}
            >
              <input
                type="radio"
                name="giftFor"
                value={o.v}
                checked={giftFor === o.v}
                onChange={() => setGiftFor(o.v)}
                className="mt-0.5"
              />
              <span className="font-medium text-ink-800">{o.label}</span>
            </label>
          ))}
        </div>

        {giftFor === "RECIPIENT" && (
          <div className="mt-3 space-y-3 rounded-xl border border-ink-200 bg-ink-50 p-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label" htmlFor="gift-first">First name</label>
                <input
                  id="gift-first"
                  className="input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="label" htmlFor="gift-last">Last name</label>
                <input
                  id="gift-last"
                  className="input"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="gift-phone">Phone number</label>
              <input
                id="gift-phone"
                type="tel"
                inputMode="tel"
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="off"
              />
            </div>
            <p className="text-xs text-ink-500">
              We&apos;ll reach out to her to set up her membership.
            </p>
          </div>
        )}
        {giftFor === "ANONYMOUS" && (
          <p className="mt-2 text-xs text-ink-500">
            Your gift goes toward a sponsored membership for a woman the studio
            chooses.
          </p>
        )}
      </fieldset>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        onClick={donate}
        disabled={pending || !effective || effective < 1}
        className="btn-primary mt-5 w-full py-3 text-base"
      >
        {pending
          ? "One moment…"
          : `Donate $${effective ? effective.toLocaleString() : "0"}${recurring ? "/mo" : ""}`}
      </button>
      <p className="mt-3 text-center text-xs text-ink-400">
        Secure checkout via Stripe. You can cancel a monthly gift anytime.
      </p>
    </div>
  );
}
