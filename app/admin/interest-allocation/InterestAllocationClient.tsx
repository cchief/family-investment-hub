"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatUGX, monthLabel } from "@/lib/currency";

type Valuation = { id: string; month: number; year: number; interest_earned: number; alreadyAllocated: boolean };
type Member = { id: string; full_name: string; member_code: string };
type PreviewRow = { memberId: string; fullName: string; balanceBefore: number; amount: number };

export function InterestAllocationClient({ valuations, members }: { valuations: Valuation[]; members: Member[] }) {
  const router = useRouter();
  const eligible = valuations.filter((v) => !v.alreadyAllocated && v.interest_earned !== 0);
  const [selectedId, setSelectedId] = useState(eligible[0]?.id ?? "");
  const selected = valuations.find((v) => v.id === selectedId);
  const [method, setMethod] = useState<"PROPORTIONAL" | "MANUAL">("PROPORTIONAL");
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [manual, setManual] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId || method !== "PROPORTIONAL") return;
    setLoading(true);
    fetch(`/api/interest-allocations/preview?fundValuationId=${selectedId}`)
      .then((r) => r.json())
      .then((d) => setPreview(d.preview ?? []))
      .finally(() => setLoading(false));
  }, [selectedId, method]);

  useEffect(() => {
    if (method === "MANUAL") {
      const init: Record<string, number> = {};
      members.forEach((m) => { init[m.id] = 0; });
      setManual(init);
    }
  }, [method, members]);

  const manualTotal = useMemo(() => Object.values(manual).reduce((s, v) => s + (v || 0), 0), [manual]);

  async function apply() {
    if (!selected) return;
    setApplying(true);
    setError(null);
    const allocations = method === "PROPORTIONAL"
      ? preview.map((p) => ({ memberId: p.memberId, amount: p.amount }))
      : Object.entries(manual).map(([memberId, amount]) => ({ memberId, amount }));

    const res = await fetch("/api/interest-allocations/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fundValuationId: selected.id, method, allocations }),
    });
    setApplying(false);
    if (!res.ok) { setError((await res.json()).error); return; }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Interest Allocation</h1>
        <p className="text-ink/50 text-sm mt-1">Split each month's investment return across members — proportionally by balance, or entered manually.</p>
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">Month to allocate</label>
            <select className="input w-56" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              <option value="">Select a fund valuation…</option>
              {valuations.map((v) => (
                <option key={v.id} value={v.id} disabled={v.alreadyAllocated}>
                  {monthLabel(v.month, v.year)} — {formatUGX(v.interest_earned)} interest {v.alreadyAllocated ? "(already allocated)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button className={`btn ${method === "PROPORTIONAL" ? "btn-primary" : "btn-secondary"} !py-1.5 !px-3 text-xs`} onClick={() => setMethod("PROPORTIONAL")}>Proportional</button>
            <button className={`btn ${method === "MANUAL" ? "btn-primary" : "btn-secondary"} !py-1.5 !px-3 text-xs`} onClick={() => setMethod("MANUAL")}>Manual</button>
          </div>
        </div>

        {!selected && <p className="text-sm text-ink/40">Select a month with recorded interest to begin.</p>}

        {selected && method === "PROPORTIONAL" && (
          <div>
            <p className="text-xs text-ink/45 mb-2">Split by each member's balance at the start of {monthLabel(selected.month, selected.year)} (fair to those who contributed longer, not rewarded for this month's own deposit).</p>
            {loading ? <p className="text-sm text-ink/40 py-4">Calculating…</p> : (
              <div className="overflow-x-auto">
                <table className="table-clean">
                  <thead><tr><th>Member</th><th>Balance before this month</th><th className="text-right">Allocated Interest</th></tr></thead>
                  <tbody>
                    {preview.map((p) => (
                      <tr key={p.memberId}>
                        <td className="font-medium">{p.fullName}</td>
                        <td className="tabular-nums text-ink/60">{formatUGX(p.balanceBefore)}</td>
                        <td className="text-right tabular-nums font-medium text-good">{formatUGX(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {selected && method === "MANUAL" && (
          <div>
            <div className="overflow-x-auto">
              <table className="table-clean">
                <thead><tr><th>Member</th><th className="text-right">Amount (UGX)</th></tr></thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td className="font-medium">{m.full_name}</td>
                      <td className="text-right">
                        <input
                          className="input w-32 text-right ml-auto"
                          type="number"
                          value={manual[m.id] ?? 0}
                          onChange={(e) => setManual((s) => ({ ...s, [m.id]: Number(e.target.value) }))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={`mt-3 text-sm flex justify-between rounded-xl px-3.5 py-2.5 ${manualTotal === selected.interest_earned ? "bg-good/10 text-good" : "bg-warn/10 text-warn"}`}>
              <span>Total allocated</span>
              <span className="font-semibold">{formatUGX(manualTotal)} of {formatUGX(selected.interest_earned)}</span>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-bad">{error}</p>}
        {selected && (
          <button className="btn btn-primary" disabled={applying} onClick={apply}>{applying ? "Allocating…" : "Approve & Allocate Interest"}</button>
        )}
      </div>
    </div>
  );
}
