import Link from "next/link";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";

// Shared shell for the legal pages (privacy / terms / accessibility): the public
// header, a proper <main> landmark, readable prose, and the footer.
export async function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const authed = Boolean(user);
  const dashboardHref = user && isStaff(user.role) ? "/admin" : "/schedule";

  return (
    <div className="bg-ink-50">
      <MarketingHeader authed={authed} dashboardHref={dashboardHref} />
      <main id="main-content" className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-ink-500">Last updated: {updated}</p>
        <div className="mt-8 space-y-5 leading-relaxed text-ink-700">
          {children}
        </div>
        <div className="mt-10 border-t border-ink-200 pt-6 text-sm">
          <Link href="/" className="font-semibold text-brand-600 hover:underline">
            ← Back to Dwell Studio
          </Link>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}

export function LegalH2({ children }: { children: React.ReactNode }) {
  return <h2 className="pt-4 text-xl font-semibold text-ink-900">{children}</h2>;
}
