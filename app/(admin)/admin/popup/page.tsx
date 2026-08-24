import { prisma } from "@/lib/db";
import { PromoForm } from "@/components/admin/PromoForm";
import { studioNow } from "@/lib/time";
import { shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PopupPage() {
  const promo = await prisma.promo.findFirst({ orderBy: { createdAt: "desc" } });

  const live =
    promo?.active &&
    promo.imageUrl &&
    (!promo.endsAt || promo.endsAt.getTime() > studioNow().getTime());

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 text-2xl font-bold">Popup announcement</h1>
      <p className="mb-6 text-sm text-ink-500">
        Show a flyer to everyone who visits the site (visitors and logged-in
        members). It appears once and people can close it. It won&apos;t show
        inside this CRM.
      </p>

      <div
        className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
          live
            ? "border-green-200 bg-green-50 text-green-800"
            : "border-ink-200 bg-ink-50 text-ink-600"
        }`}
      >
        {live ? (
          <>
            ✅ The popup is <b>live</b>
            {promo?.endsAt ? ` until ${shortDate(promo.endsAt)}` : ""}.
          </>
        ) : (
          <>The popup is <b>off</b> right now. Upload an image, set it to show, and save.</>
        )}
      </div>

      <PromoForm
        current={{
          imageUrl: promo?.imageUrl ?? "",
          alt: promo?.alt ?? "",
          linkUrl: promo?.linkUrl ?? "",
          endsAt: promo?.endsAt
            ? promo.endsAt.toISOString().slice(0, 10)
            : "",
          active: promo?.active ?? false,
        }}
      />
    </div>
  );
}
