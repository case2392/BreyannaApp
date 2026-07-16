"use client";

import { useState } from "react";
import { money } from "@/lib/format";

export type Txn = {
  id: string;
  created: number; // ms
  amountCents: number;
  refundedCents: number;
  name: string;
  email: string;
  what: string;
  type: string;
};

type SortKey = "created" | "amount" | "name";

export function TransactionsTable({ txns }: { txns: Txn[] }) {
  const [key, setKey] = useState<SortKey>("created");
  const [dir, setDir] = useState<1 | -1>(-1);

  function sortBy(k: SortKey) {
    if (k === key) setDir((d) => (d === 1 ? -1 : 1));
    else {
      setKey(k);
      setDir(k === "name" ? 1 : -1);
    }
  }

  const sorted = [...txns].sort((a, b) => {
    let av: number | string;
    let bv: number | string;
    if (key === "amount") {
      av = a.amountCents - a.refundedCents;
      bv = b.amountCents - b.refundedCents;
    } else if (key === "name") {
      av = a.name.toLowerCase();
      bv = b.name.toLowerCase();
    } else {
      av = a.created;
      bv = b.created;
    }
    return av < bv ? -dir : av > bv ? dir : 0;
  });

  const arrow = (k: SortKey) => (key === k ? (dir === 1 ? " ↑" : " ↓") : "");

  if (txns.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-ink-500">
        No transactions in this month.
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[40rem] text-sm">
        <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
          <tr>
            <th className="px-4 py-3">
              <button onClick={() => sortBy("created")}>Date{arrow("created")}</button>
            </th>
            <th className="px-4 py-3">
              <button onClick={() => sortBy("name")}>Who{arrow("name")}</button>
            </th>
            <th className="px-4 py-3">What</th>
            <th className="px-4 py-3 text-right">
              <button onClick={() => sortBy("amount")}>Amount{arrow("amount")}</button>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {sorted.map((t) => {
            const net = t.amountCents - t.refundedCents;
            return (
              <tr key={t.id} className="hover:bg-ink-50">
                <td className="whitespace-nowrap px-4 py-3 text-ink-500">
                  {new Date(t.created).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-ink-900">{t.name || "—"}</div>
                  {t.email && (
                    <div className="text-xs text-ink-500">{t.email}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="text-ink-700">{t.what}</div>
                  <span className="badge mt-0.5 bg-ink-100 text-ink-500">
                    {t.type}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">
                  {money(net)}
                  {t.refundedCents > 0 && (
                    <div className="text-xs font-normal text-red-600">
                      refunded
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
