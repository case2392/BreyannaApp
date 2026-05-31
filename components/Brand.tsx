import Link from "next/link";

// The circular Dwell mark: a sunset gradient ring around a cream center.
export function DwellMark({ size = 40 }: { size?: number }) {
  return (
    <span
      className="bg-sunset inline-flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, padding: Math.max(2, size * 0.07) }}
      aria-hidden
    >
      <span className="flex h-full w-full items-center justify-center rounded-full bg-ink-50">
        <span
          className="font-serif font-semibold leading-none text-ink-900"
          style={{ fontSize: size * 0.5 }}
        >
          D
        </span>
      </span>
    </span>
  );
}

// Mark + wordmark, used in headers.
export function Logo({
  href = "/",
  size = 38,
  light = false,
}: {
  href?: string;
  size?: number;
  light?: boolean;
}) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <DwellMark size={size} />
      <span className="leading-none">
        <span
          className={`block font-serif text-lg font-semibold tracking-wide ${
            light ? "text-white" : "text-ink-900"
          }`}
        >
          DWELL
        </span>
        <span
          className={`block text-[10px] font-medium uppercase tracking-[0.3em] ${
            light ? "text-white/70" : "text-ink-500"
          }`}
        >
          Studio
        </span>
      </span>
    </Link>
  );
}

// Large stacked seal for hero / sign-in pages.
export function DwellSeal({ size = 132 }: { size?: number }) {
  return (
    <span
      className="bg-sunset inline-flex items-center justify-center rounded-full shadow-soft"
      style={{ width: size, height: size, padding: size * 0.05 }}
      aria-hidden
    >
      <span className="flex h-full w-full flex-col items-center justify-center rounded-full bg-ink-50">
        <span
          className="font-serif font-semibold leading-none text-ink-900"
          style={{ fontSize: size * 0.27 }}
        >
          DWELL
        </span>
        <span
          className="mt-1 font-medium uppercase text-ink-500"
          style={{ fontSize: size * 0.082, letterSpacing: size * 0.025 }}
        >
          Studio
        </span>
      </span>
    </span>
  );
}
