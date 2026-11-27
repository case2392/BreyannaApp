// Infrared sauna — settings, defaults and time-slot math. Browser-safe (no
// database imports) so the CRM settings form and the booking screen share it.
//
// Times are naive studio wall-clock values held in a Date's UTC fields, like
// class times (see lib/time.ts).

export type SaunaDayHours = { closed: boolean; open: string; close: string };

export type SaunaSettings = {
  enabled: boolean;
  name: string;
  description: string;
  sessionMinutes: number;
  // Time between sessions to wipe down, restock towels and let it reheat.
  bufferMinutes: number;
  // Index 0 = Sunday … 6 = Saturday.
  hours: SaunaDayHours[];
  // Most people allowed in one private booking (the member + guests).
  maxPeople: number;
  bookAheadDays: number;
  minNoticeMinutes: number;
  // Cancel at least this many hours ahead to get the session back.
  cancelHours: number;
  // Sauna sessions one member may book per day (0 = no limit).
  dailyLimit: number;
  guidelines: string;
};

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const DEFAULT_SAUNA_GUIDELINES = `• Drink water before and after your session.
• Most people start with 15–20 minutes; step out any time you feel dizzy or unwell.
• Please check with your doctor first if you're pregnant or nursing, have a heart condition or blood-pressure concerns, take medications affected by heat, or have any other medical condition.
• Not recommended after alcohol or if you feel ill.
• Wipe down the bench with the towel provided when you're done.`;

export const DEFAULT_SAUNA_SETTINGS: SaunaSettings = {
  enabled: false,
  name: "Infrared Sauna",
  description:
    "Unwind in our Sunlighten mPulse Discover full-spectrum infrared sauna. Your session is private — the sauna is all yours.",
  sessionMinutes: 30,
  bufferMinutes: 15,
  hours: [
    { closed: true, open: "12:00", close: "17:00" }, // Sun
    { closed: false, open: "06:00", close: "20:00" },
    { closed: false, open: "06:00", close: "20:00" },
    { closed: false, open: "06:00", close: "20:00" },
    { closed: false, open: "06:00", close: "20:00" },
    { closed: false, open: "06:00", close: "20:00" },
    { closed: false, open: "08:00", close: "14:00" }, // Sat
  ],
  maxPeople: 1,
  bookAheadDays: 14,
  minNoticeMinutes: 30,
  cancelHours: 12,
  dailyLimit: 1,
  guidelines: DEFAULT_SAUNA_GUIDELINES,
};

const clampInt = (v: unknown, min: number, max: number, dflt: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt;
};
const isClock = (v: unknown): v is string =>
  typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

// Fill in anything missing/invalid with defaults.
export function normalizeSaunaSettings(raw: any): SaunaSettings {
  const d = DEFAULT_SAUNA_SETTINGS;
  const hours = Array.from({ length: 7 }, (_, i) => {
    const h = raw?.hours?.[i] ?? {};
    return {
      closed: typeof h.closed === "boolean" ? h.closed : d.hours[i].closed,
      open: isClock(h.open) ? h.open : d.hours[i].open,
      close: isClock(h.close) ? h.close : d.hours[i].close,
    };
  });
  return {
    enabled: Boolean(raw?.enabled),
    name: String(raw?.name ?? "").trim() || d.name,
    description: String(raw?.description ?? "").trim() || d.description,
    sessionMinutes: clampInt(raw?.sessionMinutes, 10, 180, d.sessionMinutes),
    bufferMinutes: clampInt(raw?.bufferMinutes, 0, 120, d.bufferMinutes),
    hours,
    maxPeople: clampInt(raw?.maxPeople, 1, 4, d.maxPeople),
    bookAheadDays: clampInt(raw?.bookAheadDays, 1, 60, d.bookAheadDays),
    minNoticeMinutes: clampInt(raw?.minNoticeMinutes, 0, 24 * 60, d.minNoticeMinutes),
    cancelHours: clampInt(raw?.cancelHours, 0, 72, d.cancelHours),
    dailyLimit: clampInt(raw?.dailyLimit, 0, 10, d.dailyLimit),
    guidelines: String(raw?.guidelines ?? "").trim() || d.guidelines,
  };
}

const MIN = 60 * 1000;

// "2026-11-28" for a wall-clock Date.
export const dayKey = (d: Date) => d.toISOString().slice(0, 10);

const at = (day: string, clock: string) => new Date(`${day}T${clock}:00Z`);

// Every bookable start time on a day, from the opening hours.
export function slotStarts(day: string, s: SaunaSettings): Date[] {
  const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
  const h = s.hours[dow];
  if (!h || h.closed) return [];
  const open = at(day, h.open).getTime();
  const close = at(day, h.close).getTime();
  const step = (s.sessionMinutes + s.bufferMinutes) * MIN;
  const out: Date[] = [];
  for (let t = open; t + s.sessionMinutes * MIN <= close; t += step) out.push(new Date(t));
  return out;
}

export type SlotStatus = "open" | "taken" | "mine" | "past" | "blocked";

export type Busy = { startsAt: Date; endsAt: Date; mine?: boolean; blocked?: boolean };

// Status of each slot on a day, given existing bookings and blocks.
export function daySlots(
  day: string,
  s: SaunaSettings,
  busy: Busy[],
  now: Date,
  opts: { ignoreNotice?: boolean } = {}
): { start: Date; end: Date; status: SlotStatus }[] {
  const earliest = now.getTime() + (opts.ignoreNotice ? 0 : s.minNoticeMinutes * MIN);
  const buffer = s.bufferMinutes * MIN;
  return slotStarts(day, s).map((start) => {
    const end = new Date(start.getTime() + s.sessionMinutes * MIN);
    // A slot is unavailable if it overlaps a booking (plus its cleanup time)
    // or a block.
    const hit = busy.find(
      (b) =>
        start.getTime() < b.endsAt.getTime() + (b.blocked ? 0 : buffer) &&
        b.startsAt.getTime() < end.getTime() + (b.blocked ? 0 : buffer)
    );
    let status: SlotStatus = "open";
    if (hit?.mine) status = "mine";
    else if (hit?.blocked) status = "blocked";
    else if (hit) status = "taken";
    else if (start.getTime() < earliest) status = "past";
    return { start, end, status };
  });
}

// The days members can book, starting today.
export function bookableDays(now: Date, s: SaunaSettings): string[] {
  const out: string[] = [];
  const base = new Date(`${dayKey(now)}T00:00:00Z`);
  for (let i = 0; i < s.bookAheadDays; i++) {
    out.push(dayKey(new Date(base.getTime() + i * 24 * 60 * MIN)));
  }
  return out;
}

export const clockLabel = (d: Date) =>
  d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });

export const dayLabelLong = (d: Date) =>
  d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

// "6:00 – 6:30 AM"
export function rangeLabel(start: Date, end: Date) {
  const a = clockLabel(start);
  const b = clockLabel(end);
  const sameHalf = a.slice(-2) === b.slice(-2);
  return `${sameHalf ? a.slice(0, -3) : a} – ${b}`;
}
