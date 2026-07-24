"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { staffRemoveBooking } from "@/app/actions/admin";

export function RemoveBookingButton({
  bookingId,
  name,
}: {
  bookingId: string;
  name: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function onClick() {
    if (!confirm(`Remove ${name} from this class? Any credit they used is refunded.`))
      return;
    // Optional note for the record (e.g. "texted she couldn't come", "no-show").
    const reason =
      window.prompt(
        `Why are you removing ${name}? (optional — leave blank to skip)`,
        ""
      ) ?? "";
    start(async () => {
      await staffRemoveBooking(bookingId, reason);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="text-xs font-medium text-ink-400 hover:text-red-600"
    >
      {pending ? "…" : "Remove"}
    </button>
  );
}
