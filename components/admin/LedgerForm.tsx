"use client";

import { useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { addLedgerEntry } from "@/app/actions/admin";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary text-sm" disabled={pending}>
      {pending ? "Adding…" : "Add entry"}
    </button>
  );
}

export function LedgerForm({ defaultDate }: { defaultDate: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action] = useFormState(
    async (
      prev: unknown,
      fd: FormData
    ): Promise<{ error?: string; ok?: boolean }> => {
      const res = await addLedgerEntry(prev, fd);
      if (res?.ok) ref.current?.reset();
      return res;
    },
    {} as { error?: string; ok?: boolean }
  );

  return (
    <form ref={ref} action={action} className="card p-5">
      <h3 className="mb-3 font-semibold">Add an expense or other revenue</h3>
      {state?.error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <div className="space-y-3">
        <div>
          <label className="label">Type</label>
          <select name="kind" className="input">
            <option value="EXPENSE">Expense</option>
            <option value="REVENUE">Other revenue (cash, Eventbrite, etc.)</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Amount ($)</label>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0"
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Date</label>
            <input
              name="date"
              type="date"
              className="input"
              defaultValue={defaultDate}
            />
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <input
            name="description"
            className="input"
            placeholder="e.g. July rent, Craft supplies, Cash class payment"
            required
          />
        </div>
        <div>
          <label className="label">Category (optional)</label>
          <input
            name="category"
            className="input"
            placeholder="e.g. Rent, Supplies, Payroll, Cash"
          />
        </div>
      </div>
      <div className="mt-4">
        <Submit />
      </div>
    </form>
  );
}
