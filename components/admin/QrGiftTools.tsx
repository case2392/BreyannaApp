"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import {
  addGiftCodes,
  generateGiftCodes,
  deleteGiftCode,
  setGiftHandled,
  createAccountFromGift,
} from "@/app/actions/qrgifts";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary text-sm">
      {pending ? "Saving…" : label}
    </button>
  );
}

export function CopyTextButton({
  text,
  label,
  className = "btn-secondary text-sm",
}: {
  text: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt("Copy this:", text);
        }
      }}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}

// Add the codes you wrote on your cards.
export function AddGiftCodesForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action] = useFormState(
    async (prev: unknown, fd: FormData) => {
      const res = await addGiftCodes(prev, fd);
      if ("ok" in res && res.ok) ref.current?.reset();
      return res;
    },
    {} as { error?: string; ok?: boolean; message?: string }
  );
  return (
    <form ref={ref} action={action} className="space-y-3">
      <div>
        <label className="label" htmlFor="qr-codes">
          Codes you wrote on your cards
        </label>
        <textarea
          id="qr-codes"
          name="codes"
          className="input min-h-[120px] font-mono text-sm"
          placeholder={"One per line. Add what it's for after a dash:\nGRACE12 - Free class\nJOY48 - Sauna session\nHOPE7 - 20% off first month"}
        />
      </div>
      <div>
        <label className="label" htmlFor="qr-default-gift">
          Gift for lines without one (optional)
        </label>
        <input
          id="qr-default-gift"
          name="gift"
          className="input"
          placeholder="e.g. Free class"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="text-sm text-green-700">{state.message}</p>}
      <Submit label="Add codes" />
    </form>
  );
}

// Or let the CRM make random, hard-to-guess codes to copy onto cards.
export function GenerateGiftCodesForm() {
  const [state, action] = useFormState(
    generateGiftCodes,
    {} as { ok?: boolean; codes?: string[]; gift?: string | null }
  );
  return (
    <div className="space-y-3">
      <form action={action} className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label" htmlFor="qr-count">
              How many
            </label>
            <input
              id="qr-count"
              name="count"
              type="number"
              min={1}
              max={200}
              defaultValue={10}
              className="input"
            />
          </div>
          <div className="col-span-2">
            <label className="label" htmlFor="qr-gen-gift">
              What these cards are for
            </label>
            <input
              id="qr-gen-gift"
              name="gift"
              className="input"
              placeholder="e.g. Free class"
            />
          </div>
        </div>
        <Submit label="Generate codes" />
      </form>
      {state?.codes && state.codes.length > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-green-800">
              {state.codes.length} new code{state.codes.length === 1 ? "" : "s"}
              {state.gift ? ` · ${state.gift}` : ""}
            </span>
            <CopyTextButton
              text={state.codes.join("\n")}
              label="Copy all"
              className="btn-secondary text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-sm sm:grid-cols-3">
            {state.codes.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function DeleteGiftCodeButton({ id, code }: { id: string; code: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-xs font-medium text-ink-500 hover:text-red-600"
      onClick={() => {
        if (!confirm(`Remove code ${code}?`)) return;
        start(async () => {
          await deleteGiftCode(id);
          router.refresh();
        });
      }}
    >
      {pending ? "…" : "Remove"}
    </button>
  );
}

// Per-recipient follow-up: create (or open) their account, and mark done.
export function GiftRecipientActions({
  id,
  memberId,
  handled,
}: {
  id: string;
  memberId: string | null;
  handled: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="flex flex-col items-end gap-2">
      {memberId ? (
        <Link
          href={`/admin/members/${memberId}`}
          className="btn-secondary text-xs"
        >
          Open account →
        </Link>
      ) : (
        <button
          type="button"
          disabled={pending}
          className="btn-primary text-xs"
          onClick={() => {
            setError(null);
            start(async () => {
              const res = await createAccountFromGift(id);
              if (!res.ok) {
                setError(res.error);
                return;
              }
              router.push(`/admin/members/${res.memberId}`);
            });
          }}
        >
          {pending ? "Creating…" : "Create account"}
        </button>
      )}
      <label className="flex items-center gap-1.5 text-xs text-ink-600">
        <input
          type="checkbox"
          defaultChecked={handled}
          onChange={(e) => {
            const v = e.target.checked;
            start(async () => {
              await setGiftHandled(id, v);
              router.refresh();
            });
          }}
        />
        Done
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
