// Where an event registration came from. Staff pick one when adding someone
// manually; online Stripe payments are tagged "Paid online" automatically.
export const EVENT_SOURCES = [
  "Eventbrite",
  "Complimentary",
  "Partnership",
  "Vendor",
  "Membership",
  "Other",
] as const;

export type EventSource = (typeof EVENT_SOURCES)[number];

export function sourceBadgeClass(source: string | null): string {
  switch (source) {
    case "Paid online":
      return "bg-green-100 text-green-700";
    case "Eventbrite":
      return "bg-orange-100 text-orange-700";
    case "Complimentary":
      return "bg-brand-50 text-brand-700";
    case "Partnership":
      return "bg-sage-200 text-sage-700";
    case "Vendor":
      return "bg-clay-200 text-clay-500";
    case "Membership":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-ink-100 text-ink-600";
  }
}
