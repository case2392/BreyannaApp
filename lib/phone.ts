// Phone number helpers. Browser-safe.
//
// Members type numbers every which way ("402-555-1234", "(402) 555 1234",
// "+1 402.555.1234"). Texting providers need the international form
// (+14025551234), and people reading a list want (402) 555-1234.

const digitsOf = (raw: string) => raw.replace(/\D/g, "");

// +14025551234, or null when it isn't a usable number. 10 digits = US/Canada.
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const d = digitsOf(trimmed);
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  if (trimmed.startsWith("+") && d.length >= 8 && d.length <= 15) return `+${d}`;
  return null;
}

// (402) 555-1234 for US/Canada numbers; anything else is left as typed.
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const e164 = toE164(raw);
  if (e164 && e164.startsWith("+1") && e164.length === 12) {
    const d = e164.slice(2);
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return raw.trim();
}
