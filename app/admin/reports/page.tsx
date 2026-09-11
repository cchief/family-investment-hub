"use client";
import { useState } from "react";
import { MONTH_NAMES } from "@/lib/currency";

export default function ReportsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [commentary, setCommentary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/reports/monthly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, year, commentary }),
    });
    setLoading(false);
    if (!res.ok) { setError("Could not generate report."); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `FIH-Monthly-Report-${MONTH_NAMES[month - 1]}-${year}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Monthly Family Report</h1>
        <p className="text-ink/50 text-sm mt-1">A clean PDF summary you can share with the whole family — opening/closing balance, compliance, interest, and outstanding members.</p>
      </div>

      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Month</label>
            <select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Year</label>
            <input className="input" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </div>
        </div>
        <div>
          <label className="label">Administrator commentary</label>
          <textarea
            className="input"
            rows={5}
            value={commentary}
            onChange={(e) => setCommentary(e.target.value)}
            placeholder="e.g. All members contributed on time this month. UAP transfer completed on the 14th. Interest allocation is up 8% month-on-month following the new UAP fund performance..."
          />
          <p className="text-[11px] text-ink/40 mt-1">This appears verbatim in the PDF under "Summary Commentary" — review before sharing with the family.</p>
        </div>
        {error && <p className="text-sm text-bad">{error}</p>}
        <button className="btn btn-primary" disabled={loading} onClick={generate}>{loading ? "Generating…" : "Generate Monthly Report (PDF)"}</button>
      </div>
    </div>
  );
}
