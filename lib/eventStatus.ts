// Registration status for an event. Events have no time cutoff — they stay open
// until sold out or manually closed by staff.
export type EventRegStatus = "open" | "sold_out" | "closed";

export function eventRegStatus(
  event: { capacity: number | null; registrationClosed: boolean },
  registrationCount: number
): EventRegStatus {
  if (event.registrationClosed) return "closed";
  if (event.capacity != null && registrationCount >= event.capacity)
    return "sold_out";
  return "open";
}

export function eventStatusLabel(s: EventRegStatus): string {
  return s === "open"
    ? "Open"
    : s === "sold_out"
    ? "Sold out"
    : "Registration closed";
}
