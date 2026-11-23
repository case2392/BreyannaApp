import { notFound } from "next/navigation";
import { GiftRedeemForm } from "@/components/GiftRedeemForm";
import { isValidGiftPageToken } from "@/lib/giftCodes";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Welcome to Dwell",
  // Private page reached only from the QR code on gift cards.
  robots: { index: false, follow: false },
};

export default async function QrGiftWelcomePage({
  params,
}: {
  params: { token: string };
}) {
  // Only reachable through the QR code's secret link.
  if (!(await isValidGiftPageToken(params.token))) notFound();

  return (
    <main
      id="main-content"
      className="min-h-screen bg-gradient-to-br from-brand-50 via-ink-50 to-clay-100 px-4 py-10"
    >
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <p className="eyebrow">A gift for you</p>
          <h1 className="mt-2 text-4xl font-semibold">Welcome to Dwell</h1>
          <span className="rule mt-4" />
          <p className="mt-5 leading-relaxed text-ink-700">
            A Christ-centered movement studio for women to worship, workout, and
            grow closer to Jesus!
          </p>
          <p className="mt-3 leading-relaxed text-ink-700">
            Thank you for shopping local and supporting our community. We are
            eager to meet you and share Dwell with you! Please fill out your
            information below and we will contact you to redeem your gift!
          </p>
        </div>

        <GiftRedeemForm token={params.token} />
      </div>
    </main>
  );
}
