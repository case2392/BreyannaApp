"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelMySauna } from "@/app/actions/sauna";

// Cancel a sauna booking. `late` = inside the cancellation window, so the
// session isn't returned — the confirm message says so up front.
export function SaunaCancelButton({
  id,
  late,
  usesSession,
}: {
  id: string;
  late: boolean;
  usesSession: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-xs font-medium text-ink-500 hover:text-red-600"
      onClick={() => {
        const msg =
          late && usesSession
            ? "Cancel this sauna session? It's within the cancellation window, so the session won't be returned."
            : usesSession
            ? "Cancel this sauna session? You'll get your session back."
            : "Cancel this sauna session?";
        if (!confirm(msg)) return;
        start(async () => {
          const res = await cancelMySauna(id);
          if (!res.ok) alert(res.error);
          router.refresh();
        });
      }}
    >
      {pending ? "Cancelling…" : "Cancel"}
    </button>
  );
}
