"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addGuestPasses } from "@/app/actions/admin";

export function GuestPassControl({
  userId,
  available,
}: {
  userId: string;
  available: number;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  function add(n: number) {
    setMsg(null);
    start(async () => {
      const res = await addGuestPasses(userId, n);
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <div className="text-sm">
        Guest passes available: <b>{available}</b>
      </div>
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => add(1)}
          disabled={pending}
          className="btn-secondary text-xs"
        >
          + 1 pass
        </button>
        <button
          onClick={() => add(2)}
          disabled={pending}
          className="btn-secondary text-xs"
        >
          + 2
        </button>
      </div>
      {msg && <p className="mt-1 text-xs text-red-600">{msg}</p>}
      <p className="mt-1 text-xs text-ink-400">
        Extra passes added here reset on renewal, like the plan&apos;s monthly
        passes.
      </p>
    </div>
  );
}
