import Link from "next/link";

// Shared site footer with legal links. Used on public marketing pages.
export function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-ink-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <nav
          aria-label="Legal"
          className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm"
        >
          <Link href="/privacy" className="text-ink-600 hover:text-brand-600">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-ink-600 hover:text-brand-600">
            Terms of Service
          </Link>
          <Link href="/accessibility" className="text-ink-600 hover:text-brand-600">
            Accessibility
          </Link>
        </nav>
        <p className="mt-4 text-center text-sm text-ink-500">
          © {year} Dwell Studio · Lincoln, NE
        </p>
      </div>
    </footer>
  );
}
