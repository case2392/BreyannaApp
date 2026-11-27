// Sale pricing shared by plans (memberships, class packs, single classes) and
// event tickets. Browser-safe: no database imports.
//
// A sale is a lower price with a real end date. It's live from saleStartsAt
// (blank = right away) until saleEndsAt, both stored as studio wall-clock times
// like class times (see lib/time.ts), so compare against studioNow().

import { studioNow } from "./time";

export type SaleFields = {
  priceCents: number;
  salePriceCents?: number | null;
  saleStartsAt?: Date | null;
  saleEndsAt?: Date | null;
};

export type ActiveSale = {
  saleCents: number;
  fullCents: number;
  savingsCents: number;
  percentOff: number;
  endsAt: Date | null;
};

export function activeSale(
  item: SaleFields,
  now: Date = studioNow()
): ActiveSale | null {
  const sale = item.salePriceCents;
  if (sale == null || sale <= 0 || sale >= item.priceCents) return null;
  if (item.saleStartsAt && now.getTime() < item.saleStartsAt.getTime()) return null;
  if (item.saleEndsAt && now.getTime() >= item.saleEndsAt.getTime()) return null;
  const savingsCents = item.priceCents - sale;
  return {
    saleCents: sale,
    fullCents: item.priceCents,
    savingsCents,
    percentOff: Math.floor((savingsCents / item.priceCents) * 100),
    endsAt: item.saleEndsAt ?? null,
  };
}

// What it costs right now: the sale price while a sale is live.
export function priceNow(item: SaleFields, now?: Date): number {
  return activeSale(item, now)?.saleCents ?? item.priceCents;
}

// Under $100 a percentage sounds bigger; at $100+ the dollar amount does (the
// "rule of 100"), so show whichever reads as the better deal.
export function savingsLabel(sale: ActiveSale): string {
  if (sale.fullCents >= 10000 || sale.percentOff < 1) {
    const dollars = sale.savingsCents / 100;
    return `Save $${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)}`;
  }
  return `Save ${sale.percentOff}%`;
}

const dayKey = (d: Date) =>
  `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;

// A sale ending exactly at midnight runs through the whole day before.
const endsAtMidnight = (d: Date) =>
  d.getUTCHours() === 0 && d.getUTCMinutes() === 0;

// "11:29 PM" (sale times are wall-clock values in UTC fields).
const clock = (d: Date) =>
  d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });

// "Sale ends tonight" / "Sale ends tomorrow at 11:29 PM" / "Sale ends
// Sunday, Nov 30". The time is shown when the sale ends before midnight.
export function saleEndsLabel(
  endsAt: Date | null,
  now: Date = studioNow()
): string | null {
  if (!endsAt) return null;
  const allDay = endsAtMidnight(endsAt);
  const last = allDay ? new Date(endsAt.getTime() - 1) : endsAt;
  const at = allDay ? "" : ` at ${clock(endsAt)}`;
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (dayKey(last) === dayKey(now))
    return allDay ? "Sale ends tonight" : `Sale ends today${at}`;
  if (dayKey(last) === dayKey(tomorrow)) return `Sale ends tomorrow${at}`;
  return `Sale ends ${last.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })}${at}`;
}

// Admin status line for a saved sale.
export function saleStatus(
  item: SaleFields,
  now: Date = studioNow()
): "live" | "scheduled" | "ended" | null {
  if (item.salePriceCents == null) return null;
  if (activeSale(item, now)) return "live";
  if (item.saleStartsAt && now.getTime() < item.saleStartsAt.getTime())
    return "scheduled";
  return "ended";
}

// yyyy-mm-dd for date inputs (sale dates are wall-clock values in UTC fields).
export const dateInputValue = (d: Date | null | undefined) =>
  d ? d.toISOString().slice(0, 10) : "";

// Read the sale fields from a CRM form. Dates are whole days: the sale starts
// at 12:00 AM on the start day and runs through 11:59 PM on the end day.
export function parseSaleForm(
  formData: FormData,
  priceCents: number
):
  | {
      salePriceCents: number | null;
      saleStartsAt: Date | null;
      saleEndsAt: Date | null;
    }
  | { error: string } {
  const none = { salePriceCents: null, saleStartsAt: null, saleEndsAt: null };
  if (formData.get("onSale") !== "on") return none;

  const price = Number(String(formData.get("salePrice") ?? "").trim());
  if (!price || price <= 0)
    return { error: "Enter a sale price, or untick “Put this on sale”." };
  const salePriceCents = Math.round(price * 100);
  if (salePriceCents >= priceCents)
    return { error: "The sale price needs to be lower than the regular price." };

  const startRaw = String(formData.get("saleStarts") ?? "").trim();
  const endRaw = String(formData.get("saleEnds") ?? "").trim();
  if (!endRaw) return { error: "Pick the last day of the sale." };
  // End time on the last day; 11:59 PM (or blank) = through the end of the day.
  const endTime = String(formData.get("saleEndTime") ?? "").trim() || "23:59";
  if (!/^\d{2}:\d{2}$/.test(endTime))
    return { error: "That sale end time isn't valid." };
  const saleEndsAt = new Date(`${endRaw}T${endTime === "23:59" ? "00:00" : endTime}:00Z`);
  if (isNaN(saleEndsAt.getTime())) return { error: "That sale end date isn't valid." };
  if (endTime === "23:59") saleEndsAt.setUTCDate(saleEndsAt.getUTCDate() + 1);

  let saleStartsAt: Date | null = null;
  if (startRaw) {
    saleStartsAt = new Date(`${startRaw}T00:00:00Z`);
    if (isNaN(saleStartsAt.getTime()))
      return { error: "That sale start date isn't valid." };
    if (saleStartsAt.getTime() >= saleEndsAt.getTime())
      return { error: "The sale has to end on or after the day it starts." };
  }
  return { salePriceCents, saleStartsAt, saleEndsAt };
}

// The end-date input shows the last day of the sale (saleEndsAt is midnight
// after it).
export const saleEndInputValue = (d: Date | null | undefined) =>
  d ? dateInputValue(endsAtMidnight(d) ? new Date(d.getTime() - 1) : d) : "";

// The end-time input: 11:59 PM for an all-day sale, else the exact time.
export const saleEndTimeInputValue = (d: Date | null | undefined) =>
  !d || endsAtMidnight(d) ? "23:59" : d.toISOString().slice(11, 16);

const shortDay = (d: Date) =>
  d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

// One-line CRM summary of a saved sale, e.g. "On sale $99 · through Sun, Nov 30".
export function saleSummary(
  item: SaleFields,
  money: (cents: number) => string,
  now: Date = studioNow()
): { tone: "live" | "scheduled" | "ended"; text: string } | null {
  const status = saleStatus(item, now);
  if (!status || item.salePriceCents == null) return null;
  const price = money(item.salePriceCents);
  const ends = item.saleEndsAt ?? null;
  const allDay = ends ? endsAtMidnight(ends) : true;
  const last = ends ? (allDay ? new Date(ends.getTime() - 1) : ends) : null;
  if (status === "live")
    return {
      tone: "live",
      text: `On sale ${price}${
        last
          ? allDay
            ? ` · through ${shortDay(last)}`
            : ` · until ${shortDay(last)}, ${clock(last)}`
          : ""
      }`,
    };
  if (status === "scheduled")
    return {
      tone: "scheduled",
      text: `Sale ${price} starts ${shortDay(item.saleStartsAt!)}`,
    };
  return {
    tone: "ended",
    text: `Sale ended${last ? ` ${shortDay(last)}` : ""} · regular price showing`,
  };
}

// How long a monthly membership keeps its sale price.
export const SALE_MONTH_OPTIONS = [1, 3, 6, 12] as const;

export function parseSaleDuration(formData: FormData) {
  const v = String(formData.get("saleDuration") ?? "1");
  if (v === "forever") return { saleLockedIn: true, saleMonths: 1 };
  const n = Number(v);
  return {
    saleLockedIn: false,
    saleMonths: (SALE_MONTH_OPTIONS as readonly number[]).includes(n) ? n : 1,
  };
}

// CRM shorthand: "first month" / "first 3 months" / "locked in".
export function saleDurationLabel(lockedIn: boolean, months: number) {
  if (lockedIn) return "locked in";
  return months > 1 ? `first ${months} months` : "first month";
}

// Form defaults for the CRM's sale fields.
export function saleDefaults(
  item: SaleFields & { saleLockedIn?: boolean; saleMonths?: number }
) {
  return {
    salePrice:
      item.salePriceCents != null ? (item.salePriceCents / 100).toFixed(2) : "",
    saleStarts: dateInputValue(item.saleStartsAt),
    saleEnds: saleEndInputValue(item.saleEndsAt),
    saleEndTime: saleEndTimeInputValue(item.saleEndsAt),
    saleLockedIn: Boolean(item.saleLockedIn),
    saleMonths: item.saleMonths ?? 1,
  };
}
