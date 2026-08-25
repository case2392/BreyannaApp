"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reservePrivateClass } from "@/app/actions/member";

export function ReservePrivateButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function reserve() {
    setError(null);
    start(async () => {
      const res = await reservePrivateClass(token);
      if (!res.ok) {
        if ("needAuth" in res && res.needAuth) {
          router.push(`/login?next=/c/${token}`);
          return;
        }
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <button
        onClick={reserve}
        disabled={pending}
        className="btn-primary w-full"
      >
        {pending ? "Reserving…" : "Reserve my spot"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
