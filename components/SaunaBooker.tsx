"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bookMySauna } from "@/app/actions/sauna";
import { BuyButton } from "@/components/BuyButton";
import { PriceTag } from "@/components/PriceTag";

export type SaunaDay = {
  day: string;
  weekday: string; // "Sat"
  date: string; // "Nov 28"
  relative: string | null; // "Today" / "Tomorrow"
  slots: { start: string; label: string; range: string; status: string }[];
};

export type SaunaPlanOption = {
  id: string;
  name: string;
  kind: string;
  fullCents: number;
  saleCents: number | null;
  note: string; // "5 sessions · $20 each" / "Unlimited · renews monthly"
};

export type SaunaAccess = {
  unlimitedName: string | null;
  credits: number;
};

export function SaunaBooker({
  days,
  access,
  plans,
  needsGuidelines,
  guidelines,
  maxPeople,
  cancelHours,
  initialSlot,
  justPurchased,
}: {
  days: SaunaDay[];
  access: SaunaAccess;
  plans: SaunaPlanOption[];
  needsGuidelines: boolean;
  guidelines: string;
  maxPeople: number;
  cancelHours: number;
  initialSlot: string | null;
  justPurchased: boolean;
}) {
  const router = useRouter();
  const firstOpenDay =
    days.find((d) => d.slots.some((s) => s.status === "open"))?.day ?? days[0]?.day;
  const initialDay =
    (initialSlot && days.find((d) => d.slots.some((s) => s.start === initialSlot))?.day) ||
    firstOpenDay;
  const [day, setDay] = useState(initialDay);
  const [slot, setSlot] = useState<string | null>(
    initialSlot &&
      days.some((d) => d.slots.some((s) => s.start === initialSlot && s.status === "open"))
      ? initialSlot
      : null
  );
  const [people, setPeople] = useState(1);
  const [guestNames, setGuestNames] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);

  const current = days.find((d) => d.day === day);
  const chosen = useMemo(
    () => days.flatMap((d) => d.slots.map((s) => ({ ...s, d }))).find((s) => s.start === slot),
    [days, slot]
  );

  // Bring the confirm step into view when a time is picked.
  useEffect(() => {
    if (slot) panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [slot]);

  // What this booking costs and whether they can cover it.
  const need = access.unlimitedName ? people - 1 : people;
  const covered = need <= access.credits;
  const payLine = access.unlimitedName
    ? need === 0
      ? `Included in your ${access.unlimitedName}`
      : `Included for you · ${need} guest session${need === 1 ? "" : "s"} from your ${access.credits} left`
    : covered
    ? `Uses ${need} of your ${access.credits} sauna session${access.credits === 1 ? "" : "s"}`
    : null;

  function book() {
    if (!slot) return;
    setError(null);
    start(async () => {
      const res = await bookMySauna({
        startsAt: slot,
        people,
        guestNames,
        acceptGuidelines: agree,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBooked(chosen ? `${chosen.d.weekday}, ${chosen.d.date} · ${chosen.range}` : "your time");
      setSlot(null);
      router.refresh();
    });
  }

  if (days.every((d) => d.slots.length === 0)) {
    return (
      <div className="card p-6 text-center text-sm text-ink-500">
        No sauna times are open in the next few days. Check back soon!
      </div>
    );
  }

  return (
    <div>
      {justPurchased && !booked && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Thank you — your sauna plan is active!{" "}
          {slot ? "Confirm your time below to finish booking." : "Pick a time to book."}
        </div>
      )}
      {booked && (
        <div
          role="status"
          className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          🎉 <b>You&apos;re booked</b> for {booked}. It&apos;s in your upcoming sessions,
          and we&apos;ve emailed you a confirmation.
        </div>
      )}

      {/* Days */}
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">
        1. Pick a day
      </h2>
      <div className="scroll-nav -mx-4 gap-2 px-4 pb-2">
        {days.map((d) => {
          const open = d.slots.filter((s) => s.status === "open").length;
          const active = d.day === day;
          return (
            <button
              key={d.day}
              type="button"
              onClick={() => {
                setDay(d.day);
                setSlot(null);
                setError(null);
              }}
              aria-pressed={active}
              className={`flex w-[4.5rem] shrink-0 flex-col items-center rounded-2xl border px-2 py-2 text-center transition ${
                active
                  ? "border-brand-500 bg-brand-500 text-white"
                  : open > 0
                  ? "border-ink-200 bg-white text-ink-800 hover:border-brand-300"
                  : "border-ink-100 bg-ink-50 text-ink-400"
              }`}
            >
              <span className="text-[11px] font-medium uppercase tracking-wide">
                {d.relative ?? d.weekday}
              </span>
              <span className="text-sm font-semibold">{d.date}</span>
              <span className={`mt-0.5 text-[10px] ${active ? "text-white/85" : ""}`}>
                {d.slots.length === 0 ? "Closed" : open === 0 ? "Full" : `${open} open`}
              </span>
            </button>
          );
        })}
      </div>

      {/* Times */}
      <h2 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wide text-ink-500">
        2. Pick a time
      </h2>
      {current && current.slots.filter((s) => s.status !== "past").length > 0 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {current.slots
            .filter((s) => s.status !== "past")
            .map((s) => {
              const isOpen = s.status === "open";
              const mine = s.status === "mine";
              const selected = s.start === slot;
              return (
                <button
                  key={s.start}
                  type="button"
                  disabled={!isOpen}
                  onClick={() => {
                    setSlot(s.start);
                    setError(null);
                    setBooked(null);
                  }}
                  aria-pressed={selected}
                  className={`rounded-xl border px-2 py-2.5 text-sm font-semibold transition ${
                    selected
                      ? "border-brand-600 bg-brand-600 text-white shadow-btn"
                      : mine
                      ? "border-green-300 bg-green-50 text-green-800"
                      : isOpen
                      ? "border-ink-200 bg-white text-ink-800 hover:border-brand-400 hover:bg-brand-50"
                      : "cursor-not-allowed border-ink-100 bg-ink-50 text-ink-400 line-through"
                  }`}
                >
                  {s.label}
                  {mine && <span className="block text-[10px] font-medium no-underline">Yours ✓</span>}
                  {!isOpen && !mine && (
                    <span className="sr-only"> — {s.status === "blocked" ? "unavailable" : "booked"}</span>
                  )}
                </button>
              );
            })}
        </div>
      ) : (
        <p className="rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-500">
          {current?.slots.length ? "No more times today — try another day." : "The sauna is closed this day."}
        </p>
      )}

      {/* Confirm */}
      {chosen && (
        <div ref={panelRef} className="card mt-5 scroll-mt-24 border-brand-200 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
            3. Confirm
          </h2>
          <p className="mt-1 text-lg font-semibold">
            {chosen.d.weekday}, {chosen.d.date} · {chosen.range}
          </p>

          {maxPeople > 1 && (
            <div className="mt-4">
              <label className="label" htmlFor="sauna-people">
                Who&apos;s coming?
              </label>
              <select
                id="sauna-people"
                className="input w-auto"
                value={people}
                onChange={(e) => setPeople(Number(e.target.value))}
              >
                {Array.from({ length: maxPeople }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? "Just me" : `Me + ${n - 1} guest${n === 2 ? "" : "s"}`}
                  </option>
                ))}
              </select>
              {people > 1 && (
                <>
                  <input
                    className="input mt-2"
                    placeholder="Guest name(s) — optional"
                    value={guestNames}
                    onChange={(e) => setGuestNames(e.target.value)}
                    aria-label="Guest names"
                  />
                  <p className="mt-1 text-xs text-ink-500">
                    Each guest uses one sauna session.
                  </p>
                </>
              )}
            </div>
          )}

          {payLine ? (
            <p className="mt-3 text-sm text-ink-700">✓ {payLine}</p>
          ) : (
            <div className="mt-4">
              <p className="text-sm font-medium text-ink-800">
                {access.credits > 0 || access.unlimitedName
                  ? "You need more sauna sessions for this booking — choose one:"
                  : "Choose how you'd like to pay — we'll bring you right back to finish booking:"}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {plans.map((p) => (
                  <div
                    key={p.id}
                    className={`flex flex-col rounded-2xl border p-3 ${
                      p.saleCents != null ? "border-clay-300 ring-1 ring-clay-300" : "border-ink-200"
                    }`}
                  >
                    <div className="font-semibold leading-tight">{p.name}</div>
                    <PriceTag
                      fullCents={p.fullCents}
                      saleCents={p.saleCents}
                      per={p.kind === "UNLIMITED" ? "/month" : undefined}
                      size="md"
                      className="mt-1"
                    />
                    <p className="mt-0.5 text-xs text-ink-500">{p.note}</p>
                    <div className="mt-3">
                      <BuyButton
                        planId={p.id}
                        returnTo={`/sauna?slot=${encodeURIComponent(chosen.start)}`}
                        label="Choose"
                        className="btn-primary w-full text-sm"
                      />
                    </div>
                  </div>
                ))}
                {plans.length === 0 && (
                  <p className="text-sm text-ink-500">
                    Sauna plans aren&apos;t available online yet — please ask the studio.
                  </p>
                )}
              </div>
            </div>
          )}

          {needsGuidelines && payLine && (
            <div className="mt-4 rounded-xl bg-clay-100/60 p-4">
              <p className="text-sm font-semibold text-ink-800">
                Before your first session
              </p>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-700">
                {guidelines}
              </p>
              <label className="mt-3 flex items-start gap-2 text-sm text-ink-800">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  I&apos;ve read these guidelines and I&apos;m comfortable using the
                  sauna.
                </span>
              </label>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {payLine && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn-primary px-6"
                disabled={pending || (needsGuidelines && !agree)}
                onClick={book}
              >
                {pending ? "Booking…" : "Book this time"}
              </button>
              <button
                type="button"
                className="btn-ghost text-sm"
                onClick={() => setSlot(null)}
              >
                Pick another time
              </button>
            </div>
          )}
          {cancelHours > 0 && (
            <p className="mt-3 text-xs text-ink-500">
              Plans change? Cancel up to {cancelHours} hour{cancelHours === 1 ? "" : "s"} before
              and you&apos;ll get your session back.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
