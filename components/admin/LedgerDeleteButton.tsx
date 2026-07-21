"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteLedgerEntry } from "@/app/actions/admin";

export function LedgerDeleteButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this entry?")) return;
        start(async () => {
          await deleteLedgerEntry(id);
          router.refresh();
        });
      }}
      className="text-xs font-medium text-ink-400 hover:text-red-600"
    >
      {pending ? "…" : "Remove"}
    </button>
  );
}
