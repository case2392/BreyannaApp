"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Banner = {
  id: string;
  message: string;
  endsLabel: string | null;
  href: string;
  cta: string;
};

// A slim announcement bar across the top of the website while a sale is live.
// Links to the plans page. Visitors can close it (remembered for this visit).
export function SaleBanner() {
  const pathname = usePathname() ?? "";
  const [banner, setBanner] = useState<Banner | null>(null);

  // Not in the CRM, on the private QR gift page, or on the plans page itself
  // (it has its own sale notice).
  const hidden =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/welcome") ||
    pathname.startsWith("/memberships");

  // Re-checked on each page change so the link follows sign-in/out.
  useEffect(() => {
    if (hidden) return;
    let cancelled = false;
    fetch("/api/sale")
      .then((r) => r.json())
      .then((d) => {
        const b: Banner | null = d?.banner ?? null;
        if (cancelled) return;
        if (!b) return setBanner(null);
        try {
          if (sessionStorage.getItem(`sale-banner-closed:${b.id}`)) return;
        } catch {}
        setBanner(b);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [hidden, pathname]);

  if (hidden || !banner) return null;

  function close() {
    try {
      sessionStorage.setItem(`sale-banner-closed:${banner!.id}`, "1");
    } catch {}
    setBanner(null);
  }

  return (
    <div
      role="region"
      aria-label="Sale"
      className="relative bg-brand-700 px-10 py-2.5 text-center text-sm text-white"
    >
      <Link href={banner.href} className="group inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
        <span className="font-semibold">🎉 {banner.message}</span>
        {banner.endsLabel && (
          <span className="text-white/85">
            <span className="hidden sm:inline">· </span>
            {banner.endsLabel}
          </span>
        )}
        <span className="font-semibold underline decoration-white/50 underline-offset-2 group-hover:decoration-white">
          {banner.cta} →
        </span>
      </Link>
      <button
        type="button"
        onClick={close}
        aria-label="Close sale banner"
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}
