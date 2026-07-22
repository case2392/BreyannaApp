"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { staffCancelGuest } from "@/app/actions/admin";

export function GuestCancelButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Remove this guest? The host's pass will be refunded."))
          return;
        start(async () => {
          await staffCancelGuest(id);
          router.refresh();
        });
      }}
      className="text-xs font-medium text-ink-400 hover:text-red-600"
    >
      {pending ? "…" : "Remove"}
    </button>
  );
}
