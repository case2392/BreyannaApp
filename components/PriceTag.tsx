import { money as fullMoney } from "@/lib/format";

// Display prices drop ".00" on whole dollars ($99 rather than $99.00).
export const displayMoney = (cents: number) =>
  cents % 100 === 0
    ? `$${(cents / 100).toLocaleString("en-US")}`
    : fullMoney(cents);

const SIZES = {
  sm: { now: "text-sm font-semibold", was: "text-xs", per: "text-xs" },
  md: { now: "font-serif text-lg font-semibold", was: "text-sm", per: "text-xs" },
  lg: { now: "text-2xl font-bold sm:text-3xl", was: "text-sm sm:text-base", per: "text-xs sm:text-sm" },
  xl: { now: "font-serif text-4xl font-semibold", was: "text-lg", per: "text-sm" },
} as const;

// A price, or — during a sale — the sale price first with the regular price
// crossed out beside it. Screen readers hear "Sale price $99, regular price
// $129" (they don't announce strikethrough on their own).
export function PriceTag({
  fullCents,
  saleCents,
  per,
  size = "md",
  className = "",
}: {
  fullCents: number;
  saleCents?: number | null;
  per?: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];
  const onSale = saleCents != null && saleCents < fullCents;
  if (!onSale)
    return (
      <span className={className}>
        <span className={s.now}>{displayMoney(fullCents)}</span>
        {per && <span className={`${s.per} text-ink-500`}>{per}</span>}
      </span>
    );
  return (
    <span className={className}>
      <span className="sr-only">
        Sale price {displayMoney(saleCents!)}
        {per ?? ""}, regular price {displayMoney(fullCents)}
      </span>
      <span aria-hidden="true" className="inline-flex flex-wrap items-baseline gap-x-2">
        <span>
          <span className={`${s.now} text-brand-700`}>{displayMoney(saleCents!)}</span>
          {per && <span className={`${s.per} text-ink-500`}>{per}</span>}
        </span>
        <s className={`${s.was} text-ink-400 decoration-ink-400`}>{displayMoney(fullCents)}</s>
      </span>
    </span>
  );
}
