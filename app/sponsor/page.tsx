import Link from "next/link";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { DonateForm } from "@/components/DonateForm";

export const dynamic = "force-dynamic";

export default async function SponsorPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const user = await getCurrentUser();
  const authed = Boolean(user);
  const dashboardHref = user && isStaff(user.role) ? "/admin" : "/schedule";

  return (
    <div className="bg-ink-50">
      <MarketingHeader authed={authed} dashboardHref={dashboardHref} />

      <main id="main-content">
      {searchParams.status === "thanks" && (
        <div className="border-b border-green-200 bg-green-50 px-4 py-3 text-center text-sm text-green-800">
          Thank you for sponsoring a sister 🤍 Your generosity makes a real
          difference.
        </div>
      )}

      <section className="relative overflow-hidden">
        <div className="bg-sunset absolute inset-0 opacity-[0.12]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-700">
              Sponsor a Sister
            </p>
            <h1 className="mt-3 font-brand text-4xl font-semibold text-ink-900 sm:text-5xl">
              Give the gift of movement &amp; community
            </h1>
            <p className="mt-5 text-lg text-ink-600">
              Not every woman who longs to be here can afford it. Your gift helps
              sponsor memberships for sisters in need — so cost is never the reason
              someone misses out on worship, movement, and community.
            </p>
            <p className="mt-4 font-serif text-lg italic text-brand-700">
              Feed her spirit. Welcome her in. Watch her flourish.
            </p>
            <p className="mt-6 text-sm text-ink-500">
              100% of your gift goes toward sponsored memberships at Dwell Studio.
            </p>
          </div>

          <div>
            <DonateForm />
            <p className="mt-4 text-center text-sm text-ink-500">
              Prefer to give in person or have questions?{" "}
              <a
                href="https://instagram.com/dwellstudio.lnk"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-brand-600 hover:underline"
              >
                Message us
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      </main>
      <footer className="border-t border-ink-200 bg-white py-8 text-center text-sm text-ink-500">
        <Link href="/" className="font-semibold text-brand-600 hover:underline">
          ← Back to Dwell Studio
        </Link>
      </footer>
      <MarketingFooter />
    </div>
  );
}
