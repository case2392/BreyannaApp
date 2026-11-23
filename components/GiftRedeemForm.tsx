"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { redeemGiftCode } from "@/app/actions/qrgifts";

export function GiftRedeemForm({ token }: { token: string }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ gift: string | null } | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await redeemGiftCode(token, {
        firstName,
        lastName,
        phone,
        email,
        code,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone({ gift: res.gift });
    });
  }

  if (done) {
    return (
      <div className="card p-6 text-center sm:p-8" role="status">
        <div className="text-4xl" aria-hidden="true">
          🤍
        </div>
        <h2 className="mt-3 text-2xl font-semibold">
          Thank you, {firstName.trim()}!
        </h2>
        <p className="mt-3 leading-relaxed text-ink-700">
          We&apos;ve received your information and will be in touch soon to help
          you redeem your gift
          {done.gift ? (
            <>
              : <b>{done.gift}</b>
            </>
          ) : null}
          . We can&apos;t wait to meet you!
        </p>
        <div className="mt-6 flex flex-col items-center gap-2 text-sm">
          <Link href="/" className="btn-primary px-6">
            Explore Dwell Studio
          </Link>
          <a
            href="https://instagram.com/dwellstudio.lnk"
            className="font-medium text-brand-600 hover:underline"
          >
            Follow along @dwellstudio.lnk
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6 sm:p-8" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="qr-first">
            First name
          </label>
          <input
            id="qr-first"
            className="input"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="qr-last">
            Last name
          </label>
          <input
            id="qr-last"
            className="input"
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="qr-phone">
          Phone number
        </label>
        <input
          id="qr-phone"
          type="tel"
          inputMode="tel"
          className="input"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="qr-email">
          Email
        </label>
        <input
          id="qr-email"
          type="email"
          inputMode="email"
          className="input"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="qr-code">
          Code from your card
        </label>
        <input
          id="qr-code"
          className="input font-mono uppercase tracking-wider placeholder:font-sans placeholder:normal-case placeholder:tracking-normal"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Exactly as written on your card"
          required
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full py-3 text-base">
        {pending ? "One moment…" : "Claim my gift"}
      </button>
      <p className="text-center text-xs text-ink-500">
        Each card&apos;s code can be used once. We&apos;ll use your info to
        contact you about your gift.
      </p>
    </form>
  );
}
