// Studio timezone handling.
//
// The studio is in US Central time, but the server runs in UTC. Class and event
// times are stored as *naive wall-clock* values — when staff type "6:00 PM" it
// is saved as 18:00 UTC and displayed back (also in UTC) as "6:00 PM", so the
// times members see are already correct. What was wrong was every "has it
// started / is it today / what's this week" comparison: those pitted those
// naive wall-clock values against the server's real UTC instant, which is ~5–6h
// ahead of Central — so classes closed and dropped off the schedule hours early.
//
// `studioNow()` returns "now" shifted so its clock fields read the studio's
// Central wall clock. Compared against the stored (naive, UTC-labelled) class
// times, every boundary now lands on the correct Central moment. Because the
// shift is derived from the IANA "America/Chicago" zone, daylight saving is
// handled automatically. This assumes the server clock is UTC (Vercel's
// default); all the day-boundary helpers in lib/format.ts read local fields,
// which equal UTC fields there.

const STUDIO_TZ = "America/Chicago";

// Re-express an instant as a Date whose UTC fields hold the studio's local
// wall clock at that instant (e.g. 2:00 PM Central -> a Date reading 14:00 UTC).
export function toStudioWallClock(instant: Date): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STUDIO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  // Intl can emit "24" for midnight in some runtimes — normalise to 0.
  const hour = get("hour") % 24;
  return new Date(
    Date.UTC(get("year"), get("month") - 1, get("day"), hour, get("minute"), get("second"))
  );
}

// "Now" in the studio's wall clock. Use this (not `new Date()`) whenever the
// value is compared against, or bucketed alongside, stored class/event times —
// e.g. "today", "this week", "has it started", "upcoming".
export function studioNow(): Date {
  return toStudioWallClock(new Date());
}
