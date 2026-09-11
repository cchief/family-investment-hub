"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { formatUGX, MONTH_NAMES } from "@/lib/currency";
import { StatusBadge } from "@/components/StatusBadge";

type Row = {
  member_id: string; full_name: string; member_code: string; status: string;
  expected: number; contribution_id: string | null; actual: number | null;
  payment_date: string | null; contrib_status: string | null; verified_by_name: string | null;
  possible_duplicate: number | null; rejection_reason: string | null;
};

function rowStatus(r: Row): string {
  if (!r.contrib_status) return "NOT_PAID";
  if (r.contrib_status === "APPROVED") return "APPROVED";
  if (r.contrib_status === "PENDING_VERIFICATION") return "PENDING_VERIFICATION";
  return "NOT_PAID";
}

export function CollectionsClient({ rows, month, year }: { rows: Row[]; month: number; year: number }) {
  const router = useRouter();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const qs = new URLSearchParams(params.toString());
    qs.set(key, value);
    router.push(`/admin/collections?${qs.toString()}`);
  }

  const totalExpected = rows.reduce((s, r) => s + r.expected, 0);
  const totalActual = rows.reduce((s, r) => s + (r.contrib_status === "APPROVED" ? r.actual ?? 0 : 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Monthly Collections</h1>
        <p className="text-ink/50 text-sm mt-1">Who has paid, who hasn't, and the variance against expectation.</p>
      </div>

      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">Month</label>
          <select className="input w-40" value={month} onChange={(e) => setParam("month", e.target.value)}>
            {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Year</label>
          <input className="input w-28" type="number" value={year} onChange={(e) => setParam("year", e.target.value)} />
        </div>
        <div className="ml-auto flex gap-4 text-sm">
          <div><span className="text-ink/45">Expected: </span><span className="font-semibold">{formatUGX(totalExpected)}</span></div>
          <div><span className="text-ink/45">Collected: </span><span className="font-semibold text-good">{formatUGX(totalActual)}</span></div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-clean">
            <thead>
              <tr>
                <th>Member</th><th>Expected</th><th>Actual</th><th>Payment Date</th><th>Proof</th><th>Status</th><th>Verified By</th><th>Variance</th><th>Comments</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const status = rowStatus(r);
                const variance = (r.contrib_status === "APPROVED" ? r.actual ?? 0 : 0) - r.expected;
                return (
                  <tr key={r.member_id} className={status === "NOT_PAID" ? "bg-bad/[0.03]" : status === "PENDING_VERIFICATION" ? "bg-warn/[0.04]" : ""}>
                    <td className="font-medium text-ink">{r.full_name} <span className="text-ink/35 font-normal">· {r.member_code}</span></td>
                    <td className="tabular-nums">{formatUGX(r.expected)}</td>
                    <td className="tabular-nums">{r.actual != null ? formatUGX(r.actual) : "—"}</td>
                    <td className="text-ink/60">{r.payment_date ? new Date(r.payment_date).toLocaleDateString("en-GB") : "—"}</td>
                    <td className="text-center">{r.contribution_id ? "✅" : "—"}</td>
                    <td><StatusBadge status={status} /> {r.possible_duplicate ? <span className="badge badge-warn ml-1">Possible duplicate ref</span> : null}</td>
                    <td className="text-ink/60">{r.verified_by_name || "—"}</td>
                    <td className={`tabular-nums ${variance < 0 ? "text-bad" : variance > 0 ? "text-good" : "text-ink/40"}`}>{variance === 0 ? "—" : formatUGX(variance)}</td>
                    <td className="text-ink/50 text-xs max-w-[180px]">{r.rejection_reason || ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
