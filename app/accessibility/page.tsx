import { LegalPage, LegalH2 } from "@/components/LegalPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Accessibility · Dwell Studio" };

export default function AccessibilityPage() {
  return (
    <LegalPage title="Accessibility Statement" updated="August 2026">
      <p>
        Dwell Studio is committed to making our website usable for everyone,
        including people with disabilities. We aim to conform to the Web Content
        Accessibility Guidelines (WCAG) 2.1 Level AA.
      </p>

      <LegalH2>What we do</LegalH2>
      <ul className="list-disc space-y-1 pl-6">
        <li>Descriptive text alternatives for meaningful images.</li>
        <li>Keyboard-accessible navigation and a visible focus indicator.</li>
        <li>A &ldquo;skip to main content&rdquo; link and clear page structure.</li>
        <li>Support for browser zoom and text resizing.</li>
        <li>Respect for reduced-motion preferences.</li>
        <li>Ongoing review of color contrast and form labeling.</li>
      </ul>

      <LegalH2>Ongoing effort</LegalH2>
      <p>
        Accessibility is an ongoing process. We continue to test and improve the
        site, and some third-party tools (such as payment checkout) are provided
        by other companies and may differ.
      </p>

      <LegalH2>Need help or found a problem?</LegalH2>
      <p>
        If you have trouble using any part of this site, or need information in
        another format, please let us know and we&apos;ll help and work to fix
        the issue. Dwell Studio · Email{" "}
        <a
          href="mailto:dwellstudio.lnk@gmail.com"
          className="text-brand-600 hover:underline"
        >
          dwellstudio.lnk@gmail.com
        </a>{" "}
        · 800 West Stockwell St, Lincoln, NE 68522 · Instagram{" "}
        <a
          href="https://instagram.com/dwellstudio.lnk"
          className="text-brand-600 hover:underline"
        >
          @dwellstudio.lnk
        </a>
        .
      </p>
    </LegalPage>
  );
}
