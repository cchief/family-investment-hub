"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatUGX, monthLabel } from "@/lib/currency";

type Item = {
  id: string; member_id: string; full_name: string; member_code: string; amount: number;
  month: number; year: number; payment_date: string; payment_reference: string | null;
  payment_method: string; notes: string | null; possible_duplicate: number;
  evidence: { id: string; filename: string; mime_type: string; document_id: string }[];
};

const MIN = 100_000, MAX = 500_000;

export function VerificationClient({ items }: { items: Item[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState<Record<string, string>>({});
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [error, setError] = useState<Record<string, string>>({});

  async function approve(id: string) {
    const item = items.find((i) => i.id === id)!;
    const overLimit = item.amount < MIN || item.amount > MAX;
    if (overLimit && !overrideReason[id]?.trim()) {
      setError((e) => ({ ...e, [id]: "This amount is outside UGX 100,000–500,000. Enter an override reason to approve." }));
      return;
    }
    setBusy(id);
    const res = await fetch(`/api/contributions/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overrideReason: overrideReason[id] }),
    });
    setBusy(null);
    if (!res.ok) {
      const data = await res.json();
      setError((e) => ({ ...e, [id]: data.error }));
      return;
    }
    router.refresh();
  }

  async function reject(id: string) {
    if (!rejectReason[id]?.trim()) {
      setError((e) => ({ ...e, [id]: "Provide a reason so the member knows what to fix." }));
      return;
    }
    setBusy(id);
    const res = await fetch(`/api/contributions/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: rejectReason[id] }),
    });
    setBusy(null);
    if (!res.ok) {
      const data = await res.json();
      setError((e) => ({ ...e, [id]: data.error }));
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Verification Queue</h1>
        <p className="text-ink/50 text-sm mt-1">{items.length} contribution{items.length === 1 ? "" : "s"} awaiting review. Uploading a document never approves a contribution by itself.</p>
      </div>

      {items.length === 0 && (
        <div className="card p-10 text-center text-ink/40">Nothing waiting for verification. 🎉</div>
      )}

      <div className="space-y-4">
        {items.map((item) => {
          const overLimit = item.amount < MIN || item.amount > MAX;
          return (
            <div key={item.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-display font-semibold text-ink">{item.full_name} <span className="text-ink/35 font-sans text-sm font-normal">· {item.member_code}</span></p>
                  <p className="text-xs text-ink/45 mt-0.5">{monthLabel(item.month, item.year)} contribution · submitted for {item.payment_method}</p>
                </div>
                <div className="text-right">
                  <p className="font-display font-semibold text-lg text-ink tabular-nums">{formatUGX(item.amount)}</p>
                  {overLimit && <span className="badge badge-warn">Outside normal range</span>}
                  {item.possible_duplicate === 1 && <span className="badge badge-warn ml-1">Possible duplicate reference</span>}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-sm mb-3">
                <p><span className="text-ink/45">Payment date: </span>{new Date(item.payment_date).toLocaleDateString("en-GB")}</p>
                <p><span className="text-ink/45">Reference: </span>{item.payment_reference || "—"}</p>
                {item.notes && <p className="sm:col-span-2"><span className="text-ink/45">Notes: </span>{item.notes}</p>}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {item.evidence.map((e) => (
                  <a key={e.id} href={`/api/documents/${e.document_id}`} target="_blank" rel="noreferrer" className="btn btn-secondary !py-1.5 !px-3 text-xs">
                    {e.mime_type === "application/pdf" ? "📄" : "🖼️"} {e.filename}
                  </a>
                ))}
              </div>

              {overLimit && (
                <div className="mb-3">
                  <label className="label">Override reason (required to approve)</label>
                  <input className="input" value={overrideReason[item.id] ?? ""} onChange={(e) => setOverrideReason((s) => ({ ...s, [item.id]: e.target.value }))} placeholder="e.g. catch-up contribution agreed with family" />
                </div>
              )}

              {error[item.id] && <p className="text-sm text-bad mb-3">{error[item.id]}</p>}

              <div className="flex flex-wrap gap-2 items-center">
                <button className="btn btn-primary" disabled={busy === item.id} onClick={() => approve(item.id)}>Approve</button>
                <input
                  className="input flex-1 min-w-[180px]"
                  placeholder="Rejection reason (if rejecting)"
                  value={rejectReason[item.id] ?? ""}
                  onChange={(e) => setRejectReason((s) => ({ ...s, [item.id]: e.target.value }))}
                />
                <button className="btn btn-danger" disabled={busy === item.id} onClick={() => reject(item.id)}>Reject</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
