// Gift types for QR gift-card codes. Safe to use in the browser (no DB code).

// What a card's code is for. Amount = % for discounts, count for classes.
export const GIFT_TYPES = [
  { key: "SAUNA", label: "Sauna session", amount: null },
  { key: "CLASS", label: "Free class(es)", amount: "count" },
  { key: "GUEST_PASS", label: "Free guest pass", amount: null },
  { key: "MERCH_DISCOUNT", label: "% off merch", amount: "percent" },
  { key: "MEMBERSHIP_DISCOUNT", label: "% off membership", amount: "percent" },
  { key: "OTHER", label: "Other", amount: null },
] as const;

export type GiftTypeKey = (typeof GIFT_TYPES)[number]["key"];

// Build the gift's label from the picker, e.g. "Sauna session", "3 free
// classes", "20% off merch". Returns an error message when input is missing.
export function buildGiftLabel(
  type: string,
  amountRaw: string,
  custom: string
): { type: GiftTypeKey; label: string } | { error: string } {
  const amount = Math.floor(Number(amountRaw));
  switch (type) {
    case "SAUNA":
      return { type, label: "Sauna session" };
    case "GUEST_PASS":
      return { type, label: "Free guest pass" };
    case "CLASS":
      if (!(amount >= 1 && amount <= 50))
        return { error: "Enter how many free classes (1–50)." };
      return { type, label: amount === 1 ? "Free class" : `${amount} free classes` };
    case "MERCH_DISCOUNT":
    case "MEMBERSHIP_DISCOUNT":
      if (!(amount >= 1 && amount <= 100))
        return { error: "Enter the discount percent (1–100)." };
      return {
        type,
        label: `${amount}% off ${type === "MERCH_DISCOUNT" ? "merch" : "membership"}`,
      };
    case "OTHER": {
      const label = custom.trim().slice(0, 120);
      if (!label) return { error: "Describe what these codes are for." };
      return { type, label };
    }
    default:
      return { error: "Choose what these codes are for." };
  }
}

// How the gift reads mid-sentence: "redeem your sauna session".
export function giftPhrase(type: string | null, label: string | null): string | null {
  if (!label) return null;
  if (!type || type === "OTHER") return label; // typed by staff — keep as-is
  return label.charAt(0).toLowerCase() + label.slice(1);
}
