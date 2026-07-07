"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeRegistration } from "@/app/actions/events";

export function RemoveRegistrationButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Remove this registration?")) return;
        start(async () => {
          await removeRegistration(id);
          router.refresh();
        });
      }}
      className="text-xs font-medium text-ink-400 hover:text-red-600"
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}
