"use client";
import { useEffect, useState } from "react";
import { formatUGX, MONTH_NAMES } from "@/lib/currency";

type Row = { date: string; type: string; description: string; amount: number; runningBalance: number };

function monthRange(month: number, year: number) {
  const from = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { from, to };
}

export default function StatementsPage() {
  const now = new Date();
  const [mode, setMode] = useState<"month" | "range" | "all">("month");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [from, setFrom] = useState(monthRange(now.getMonth() + 1, now.getFullYear()).from);
  const [to, setTo] = useState(now.toISOString().slice(0, 10));
  const [rows, setRows] = useState<Row[]>([]);
  const [opening, setOpening] = useState(0);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (mode === "month") {
      const r = monthRange(month, year);
      qs.set("from", r.from); qs.set("to", r.to);
    } else if (mode === "range") {
      qs.set("from", from); qs.set("to", to);
    }
    const res = await fetch(`/api/statements?${qs.toString()}`);
    const data = await res.json();
    setRows(data.rows ?? []);
    setOpening(data.openingBalance ?? 0);
    setLoading(false);
  }

  useEffect(() => { load(); }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Statements</h1>
        <p className="text-ink/50 text-sm mt-1">Every transaction posted to your balance, with a running total.</p>
      </div>

      <div className="card p-4 sm:p-5">
        <div className="flex flex-wrap gap-2 mb-4">
          {(["month", "range", "all"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`btn ${mode === m ? "btn-primary" : "btn-secondary"} !py-1.5 !px-3 text-xs`}
            >
              {m === "month" ? "Selected Month" : m === "range" ? "Custom Range" : "Entire Membership"}
            </button>
          ))}
        </div>

        {mode === "month" && (
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="label">Month</label>
              <select className="input w-40" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Year</label>
              <input className="input w-28" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
            </div>
            <button className="btn btn-secondary" onClick={load}>Apply</button>
          </div>
        )}
        {mode === "range" && (
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="label">From</label>
              <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">To</label>
              <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <button className="btn btn-secondary" onClick={load}>Apply</button>
          </div>
        )}
        {mode === "all" && <p className="text-sm text-ink/50">Showing every transaction since you joined.</p>}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-clean">
            <thead>
              <tr><th>Date</th><th>Transaction</th><th className="text-right">Amount</th><th className="text-right">Running Balance</th></tr>
            </thead>
            <tbody>
              {mode !== "all" && (
                <tr className="bg-black/[0.02]">
                  <td colSpan={3} className="text-ink/50 font-medium">Opening balance</td>
                  <td className="text-right font-medium tabular-nums">{formatUGX(opening)}</td>
                </tr>
              )}
              {loading && <tr><td colSpan={4} className="text-center text-ink/40 py-8">Loading…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={4} className="text-center text-ink/40 py-8">No transactions in this period.</td></tr>}
              {!loading && rows.map((r, i) => (
                <tr key={i}>
                  <td className="text-ink/60">{new Date(r.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                  <td className="text-ink/70">{r.description}</td>
                  <td className={`text-right tabular-nums ${r.amount < 0 ? "text-bad" : "text-ink"}`}>{formatUGX(r.amount)}</td>
                  <td className="text-right font-medium tabular-nums">{formatUGX(r.runningBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
