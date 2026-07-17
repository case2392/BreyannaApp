"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setEventRegistrationClosed } from "@/app/actions/events";

export function EventRegistrationToggle({
  eventId,
  closed,
}: {
  eventId: string;
  closed: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setEventRegistrationClosed(eventId, !closed);
          router.refresh();
        })
      }
      className={`btn-secondary text-sm ${
        closed ? "text-green-700" : "text-red-600"
      }`}
    >
      {pending ? "…" : closed ? "Reopen registration" : "Close registration"}
    </button>
  );
}
