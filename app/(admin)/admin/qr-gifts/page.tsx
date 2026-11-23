import { headers } from "next/headers";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { shortDate, timeLabel } from "@/lib/format";
import { getGiftPageToken } from "@/lib/giftCodes";
import {
  AddGiftCodesForm,
  GenerateGiftCodesForm,
  CopyTextButton,
  DeleteGiftCodeButton,
  GiftRecipientActions,
} from "@/components/admin/QrGiftTools";

export const dynamic = "force-dynamic";

function siteOrigin(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export default async function QrGiftsPage() {
  const token = await getGiftPageToken();
  const url = `${siteOrigin().replace(/\/$/, "")}/welcome/${token}`;

  const qrOpts = {
    errorCorrectionLevel: "M" as const,
    margin: 2,
    color: { dark: "#2D2D2D", light: "#FFFFFF" },
  };
  const [qrPng, qrSvg, codes] = await Promise.all([
    QRCode.toDataURL(url, { ...qrOpts, width: 1200 }),
    QRCode.toString(url, { ...qrOpts, type: "svg" }),
    prisma.giftCode.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  const qrSvgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}`;

  const redeemed = codes
    .filter((c) => c.redeemedAt)
    .sort((a, b) => b.redeemedAt!.getTime() - a.redeemedAt!.getTime());
  const unused = codes.filter((c) => !c.redeemedAt);
  const waiting = redeemed.filter((c) => !c.handled).length;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">QR Code Gift Recipients</h1>
      <p className="mb-6 text-sm text-ink-500">
        People who scanned the QR code on your gift cards and claimed their gift.
        Each card code works once.
      </p>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <div className="text-xs text-ink-500">Codes on cards</div>
          <div className="text-2xl font-bold">{codes.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ink-500">Redeemed</div>
          <div className="text-2xl font-bold">{redeemed.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ink-500">Waiting for you</div>
          <div className={`text-2xl font-bold ${waiting > 0 ? "text-amber-700" : ""}`}>
            {waiting}
          </div>
        </div>
      </div>

      {/* Recipients */}
      <h2 className="mb-3 font-semibold">Gift recipients</h2>
      {redeemed.length === 0 ? (
        <div className="card mb-8 p-6 text-center text-sm text-ink-500">
          No one has claimed a gift yet. When they do, they&apos;ll show up here
          and you&apos;ll get an email.
        </div>
      ) : (
        <div className="mb-8 space-y-2">
          {redeemed.map((r) => (
            <div
              key={r.id}
              className={`card flex flex-wrap items-start justify-between gap-3 p-4 ${
                r.handled ? "opacity-60" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="font-semibold">
                  {r.firstName} {r.lastName}
                  {!r.handled && (
                    <span className="badge ml-2 bg-amber-100 text-amber-800">New</span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-sm">
                  <a href={`tel:${r.phone}`} className="text-brand-600 hover:underline">
                    {r.phone}
                  </a>
                  <a href={`mailto:${r.email}`} className="text-brand-600 hover:underline">
                    {r.email}
                  </a>
                </div>
                <div className="mt-1 text-xs text-ink-500">
                  Gift: <b className="text-ink-700">{r.gift || "—"}</b> · Code{" "}
                  <span className="font-mono">{r.code}</span> · Claimed{" "}
                  {shortDate(r.redeemedAt!)} {timeLabel(r.redeemedAt!)}
                </div>
              </div>
              <GiftRecipientActions id={r.id} memberId={r.memberId} handled={r.handled} />
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* QR code */}
        <div className="card p-5">
          <h2 className="mb-1 font-semibold">Your QR code</h2>
          <p className="mb-4 text-xs text-ink-500">
            Print this on your cards. It opens a private page that isn&apos;t
            linked anywhere on your site, and only accepts the codes below.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrPng}
              alt="QR code linking to the Dwell gift page"
              className="h-44 w-44 rounded-lg border border-ink-200"
            />
            <div className="flex flex-col gap-2">
              <a href={qrPng} download="dwell-gift-qr.png" className="btn-primary text-sm">
                Download QR (PNG)
              </a>
              <a href={qrSvgUrl} download="dwell-gift-qr.svg" className="btn-secondary text-sm">
                Download SVG (best for print)
              </a>
              <CopyTextButton text={url} label="Copy page link" />
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-brand-600 hover:underline"
              >
                Preview the page →
              </a>
            </div>
          </div>
        </div>

        {/* Codes */}
        <div className="card space-y-6 p-5">
          <div>
            <h2 className="mb-1 font-semibold">Add your card codes</h2>
            <p className="mb-3 text-xs text-ink-500">
              Only codes listed here will work on the page.
            </p>
            <AddGiftCodesForm />
          </div>
          <div className="border-t border-ink-100 pt-5">
            <h3 className="mb-1 text-sm font-semibold">Or generate codes for you</h3>
            <p className="mb-3 text-xs text-ink-500">
              Random codes are hard to guess. Copy them onto your cards.
            </p>
            <GenerateGiftCodesForm />
          </div>
        </div>
      </div>

      {/* Unused codes */}
      <h2 className="mb-3 mt-8 font-semibold">
        Unused codes ({unused.length})
      </h2>
      {unused.length === 0 ? (
        <div className="card p-6 text-center text-sm text-ink-500">
          No unused codes. Add the codes from your cards above.
        </div>
      ) : (
        <div className="card divide-y divide-ink-100">
          {unused.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="text-sm">
                <span className="font-mono font-medium">{c.code}</span>
                {c.gift && <span className="ml-2 text-ink-500">· {c.gift}</span>}
              </div>
              <DeleteGiftCodeButton id={c.id} code={c.code} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
