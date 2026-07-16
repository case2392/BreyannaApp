"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  cancelSession,
  markAttendance,
  setRegistrationClosed,
} from "@/app/actions/admin";

// Toggle booking open/closed for a class.
export function RegistrationToggle({
  sessionId,
  closed,
}: {
  sessionId: string;
  closed: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function toggle() {
    start(async () => {
      await setRegistrationClosed(sessionId, !closed);
      router.refresh();
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`btn-secondary text-xs ${
        closed ? "text-green-700" : "text-red-600"
      }`}
    >
      {pending ? "…" : closed ? "Reopen booking" : "Close booking"}
    </button>
  );
}

export function CancelSessionButton({ sessionId }: { sessionId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function onClick() {
    if (!confirm("Cancel this class? Booked members will be released and refunded."))
      return;
    start(async () => {
      await cancelSession(sessionId);
      router.refresh();
    });
  }

  return (
    <button onClick={onClick} disabled={pending} className="btn-secondary text-xs">
      {pending ? "…" : "Cancel class"}
    </button>
  );
}

export function AttendanceControls({
  bookingId,
  status,
}: {
  bookingId: string;
  status: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function set(next: "ATTENDED" | "NO_SHOW" | "BOOKED") {
    start(async () => {
      await markAttendance(bookingId, next);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-1">
      <button
        onClick={() => set(status === "ATTENDED" ? "BOOKED" : "ATTENDED")}
        disabled={pending}
        className={`badge ${
          status === "ATTENDED"
            ? "bg-green-600 text-white"
            : "bg-green-50 text-green-700 hover:bg-green-100"
        }`}
      >
        Present
      </button>
      <button
        onClick={() => set(status === "NO_SHOW" ? "BOOKED" : "NO_SHOW")}
        disabled={pending}
        className={`badge ${
          status === "NO_SHOW"
            ? "bg-red-600 text-white"
            : "bg-red-50 text-red-700 hover:bg-red-100"
        }`}
      >
        No-show
      </button>
    </div>
  );
}
