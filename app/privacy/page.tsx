import { LegalPage, LegalH2 } from "@/components/LegalPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Privacy Policy · Dwell Studio" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="August 2026">
      <p>
        This Privacy Policy explains what information Dwell Studio
        (&ldquo;Dwell Studio,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;)
        collects when you use our website and booking platform, how we use it,
        and the choices you have. By using the site, you agree to this policy.
      </p>

      <LegalH2>Information we collect</LegalH2>
      <p>When you create an account or use the studio, we collect:</p>
      <ul className="list-disc space-y-1 pl-6">
        <li>
          <b>Account details</b> — your name, email address, phone number, and a
          password (stored only in encrypted/hashed form).
        </li>
        <li>
          <b>Activity</b> — your class bookings, attendance, memberships and
          passes, waitlist and guest-pass activity, and event registrations.
        </li>
        <li>
          <b>Payments</b> — purchases are processed by our payment provider
          (Stripe). We do <b>not</b> store your full card number; Stripe handles
          card data. We keep records of what was purchased and amounts.
        </li>
        <li>
          <b>Communications</b> — emails and text messages we send you, and any
          notes staff add to your account for studio operations.
        </li>
      </ul>

      <LegalH2>How we use your information</LegalH2>
      <ul className="list-disc space-y-1 pl-6">
        <li>To provide the service — accounts, bookings, memberships, and events.</li>
        <li>To process payments and manage renewals.</li>
        <li>
          To send you transactional messages (booking confirmations, reminders,
          payment issues) and, if you opt in, occasional studio updates.
        </li>
        <li>To keep the studio running safely and to prevent misuse.</li>
      </ul>

      <LegalH2>How we share information</LegalH2>
      <p>
        We do not sell your personal information. We share it only with service
        providers that help us run the studio, under their own terms:
      </p>
      <ul className="list-disc space-y-1 pl-6">
        <li>
          <b>Stripe</b> — payment processing and subscription billing.
        </li>
        <li>
          <b>Resend</b> (email) and <b>Twilio</b> (text messages) — to deliver
          messages you receive from us.
        </li>
        <li>
          <b>Vercel</b> and <b>Neon</b> — website hosting and database storage.
        </li>
      </ul>
      <p>
        We may also disclose information if required by law or to protect the
        rights and safety of the studio, our members, or others.
      </p>

      <LegalH2>Text messages and email</LegalH2>
      <p>
        If you provide a phone number, you may receive account-related texts.
        Marketing texts, if any, are only sent with your consent; reply
        <b> STOP</b> to opt out at any time. Every marketing email includes an
        unsubscribe option. Message and data rates may apply.
      </p>

      <LegalH2>Cookies</LegalH2>
      <p>
        We use a single essential cookie to keep you signed in. We do not use
        advertising or third-party tracking cookies.
      </p>

      <LegalH2>Your choices &amp; rights</LegalH2>
      <p>
        You can view and update your profile in your account, and you can ask us
        to correct or delete your information. Deleting certain records (such as
        payment history) may be limited by our legal and accounting obligations.
      </p>

      <LegalH2>Children</LegalH2>
      <p>
        The website and accounts are intended for adults. Children may attend
        family classes under the supervision of a parent or guardian who holds
        the account. We do not knowingly collect personal information directly
        from children under 13.
      </p>

      <LegalH2>Data retention &amp; security</LegalH2>
      <p>
        We keep your information for as long as your account is active or as
        needed to provide the service and meet legal obligations. We use
        reasonable measures to protect it, though no method of transmission or
        storage is completely secure.
      </p>

      <LegalH2>Changes to this policy</LegalH2>
      <p>
        We may update this policy from time to time. Material changes will be
        reflected by the &ldquo;Last updated&rdquo; date above.
      </p>

      <LegalH2>Contact us</LegalH2>
      <p>
        Dwell Studio · 800 West Stockwell St, Lincoln, NE 68522 · Email{" "}
        <a
          href="mailto:dwellstudio.lnk@gmail.com"
          className="text-brand-600 hover:underline"
        >
          dwellstudio.lnk@gmail.com
        </a>{" "}
        · Instagram{" "}
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
