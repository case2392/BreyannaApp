"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { togglePlan } from "@/app/actions/admin";

export function PlanToggle({
  planId,
  active,
}: {
  planId: string;
  active: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function toggle() {
    start(async () => {
      await togglePlan(planId, !active);
      router.refresh();
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`badge ${
        active
          ? "bg-green-100 text-green-700 hover:bg-green-200"
          : "bg-ink-100 text-ink-500 hover:bg-ink-200"
      }`}
    >
      {active ? "Active" : "Hidden"}
    </button>
  );
}
