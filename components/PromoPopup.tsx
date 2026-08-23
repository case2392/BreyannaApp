"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Promo = { id: string; imageUrl: string; linkUrl: string | null };

// Site-wide promo popup: shows an uploaded flyer once (until dismissed) to
// visitors and members. Skipped inside the admin CRM. Dismissal is remembered
// per-promo in the browser so it doesn't nag on every page.
export function PromoPopup() {
  const pathname = usePathname();
  const [promo, setPromo] = useState<Promo | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Don't show inside the admin area.
    if (pathname && pathname.startsWith("/admin")) return;
    let cancelled = false;
    fetch("/api/promo")
      .then((r) => r.json())
      .then((d) => {
        const p: Promo | null = d?.promo ?? null;
        if (!p || cancelled) return;
        try {
          if (localStorage.getItem(`promo-dismissed-${p.id}`)) return;
        } catch {}
        setPromo(p);
        setOpen(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  function dismiss() {
    setOpen(false);
    if (promo) {
      try {
        localStorage.setItem(`promo-dismissed-${promo.id}`, "1");
      } catch {}
    }
  }

  if (!open || !promo) return null;

  // eslint-disable-next-line @next/next/no-img-element
  const image = (
    <img
      src={promo.imageUrl}
      alt="Studio announcement"
      className="block max-h-[85vh] w-auto max-w-full rounded-2xl shadow-2xl"
    />
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-semibold text-ink-700 shadow-lg hover:bg-ink-100"
        >
          ✕
        </button>
        {promo.linkUrl ? (
          <a href={promo.linkUrl} onClick={dismiss}>
            {image}
          </a>
        ) : (
          image
        )}
      </div>
    </div>
  );
}
