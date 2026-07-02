"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Brand";

const links = [
  { href: "/#about", label: "About" },
  { href: "/#classes", label: "Classes" },
  { href: "/#schedule", label: "Schedule" },
  { href: "/#membership", label: "Membership" },
  { href: "/sponsor", label: "Sponsor a Sister" },
  { href: "/#visit", label: "Visit" },
];

export function MarketingHeader({
  authed,
  dashboardHref,
}: {
  authed: boolean;
  dashboardHref: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-ink-200/70 bg-ink-50/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Logo href="/" size={36} />

        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-ink-700 transition hover:text-brand-600"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {authed ? (
            <Link href={dashboardHref} className="btn-primary text-sm">
              My account
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost text-sm">
                Sign in
              </Link>
              <Link href="/register" className="btn-primary text-sm">
                Join now
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="rounded-lg p-2 text-ink-700 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-ink-200 bg-ink-50 px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2 text-sm font-medium text-ink-700 hover:bg-ink-100"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 flex gap-2">
            {authed ? (
              <Link href={dashboardHref} className="btn-primary flex-1 text-sm">
                My account
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn-secondary flex-1 text-sm">
                  Sign in
                </Link>
                <Link href="/register" className="btn-primary flex-1 text-sm">
                  Join now
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
