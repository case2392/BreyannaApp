import { LegalPage, LegalH2 } from "@/components/LegalPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Terms of Service · Dwell Studio" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="August 2026">
      <p>
        These Terms govern your use of the Dwell Studio website, booking
        platform, classes, and events. By creating an account or making a
        purchase, you agree to these Terms.
      </p>

      <LegalH2>Accounts</LegalH2>
      <p>
        You are responsible for the accuracy of your account information and for
        keeping your password secure. You must be at least 18 to create an
        account. Notify us promptly of any unauthorized use.
      </p>

      <LegalH2>Memberships, passes &amp; billing</LegalH2>
      <ul className="list-disc space-y-1 pl-6">
        <li>
          <b>Subscriptions</b> (e.g. unlimited memberships) renew automatically
          each month using your payment method on file until you cancel. You can
          cancel from your account or by contacting the studio; cancellation
          stops future renewals.
        </li>
        <li>
          <b>Class packs and single classes</b> are one-time purchases. Their
          credits do not expire unless stated.
        </li>
        <li>
          <b>Failed payments</b> pause a membership until payment is resolved;
          access resumes automatically once the payment succeeds.
        </li>
        <li>
          Prices and plan details may change; changes apply to future purchases
          and renewals.
        </li>
      </ul>

      <LegalH2>Refunds &amp; cancellations</LegalH2>
      <p>
        Purchases are generally non-refundable except where required by law or
        at the studio&apos;s discretion. If the studio cancels a class or event,
        we will refund or credit affected purchases. Please contact the studio
        with any billing questions.
      </p>

      <LegalH2>Booking, waitlists &amp; guests</LegalH2>
      <p>
        Booking a class reserves your spot subject to capacity. If a class is
        full you may be added to a waitlist and moved up automatically if a spot
        opens. Guest passes and gifted spots are subject to availability and the
        studio&apos;s rules. The studio may close registration or remove a
        booking when needed (for example, to manage capacity or safety).
      </p>

      <LegalH2>Health &amp; assumption of risk</LegalH2>
      <p>
        Our classes involve physical activity. You should consult a physician
        before beginning any exercise program. By participating, you acknowledge
        that physical activity carries inherent risks and you assume those risks
        to the extent permitted by law. This section does not replace any
        separate liability waiver the studio may ask you to sign.
      </p>

      <LegalH2>Acceptable use</LegalH2>
      <p>
        You agree not to misuse the site, interfere with its operation, attempt
        to access other members&apos; information, or use it for unlawful
        purposes.
      </p>

      <LegalH2>Intellectual property</LegalH2>
      <p>
        The Dwell Studio name, logo, content, and site are owned by the studio
        and may not be copied or used without permission.
      </p>

      <LegalH2>Disclaimers &amp; limitation of liability</LegalH2>
      <p>
        The service is provided &ldquo;as is&rdquo; without warranties of any
        kind. To the fullest extent permitted by law, Dwell Studio is not liable
        for indirect, incidental, or consequential damages arising from your use
        of the site or participation in classes and events.
      </p>

      <LegalH2>Governing law</LegalH2>
      <p>
        These Terms are governed by the laws of the State of Nebraska, without
        regard to its conflict-of-laws rules.
      </p>

      <LegalH2>Changes</LegalH2>
      <p>
        We may update these Terms from time to time. Continued use of the site
        after changes take effect means you accept the updated Terms.
      </p>

      <LegalH2>Contact us</LegalH2>
      <p>
        Dwell Studio · 800 West Stockwell St, Lincoln, NE 68522 · Instagram{" "}
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
