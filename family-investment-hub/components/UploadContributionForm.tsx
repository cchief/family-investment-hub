"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MONTH_NAMES } from "@/lib/currency";

const METHODS = ["Bank Deposit", "Bank Transfer", "Mobile Money", "Cash to Treasurer"];

export function UploadContributionForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [amount, setAmount] = useState(200000);
  const [paymentDate, setPaymentDate] = useState(now.toISOString().slice(0, 10));
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(METHODS[0]);
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!files || files.length === 0) {
      setError("Please attach at least one proof of payment.");
      return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.set("month", String(month));
    fd.set("year", String(year));
    fd.set("amount", String(amount));
    fd.set("paymentDate", paymentDate);
    fd.set("paymentReference", paymentReference);
    fd.set("paymentMethod", paymentMethod);
    fd.set("notes", notes);
    Array.from(files).forEach((f) => fd.append("evidence", f));

    const res = await fetch("/api/contributions", { method: "POST", body: fd });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not submit contribution.");
      return;
    }
    onClose();
    router.refresh();
  }

  const outOfRange = amount < 100_000 || amount > 500_000;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Contribution Month</label>
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
        <label className="label">Contribution Amount (UGX)</label>
        <input className="input" type="number" min={1} step={1000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} required />
        {outOfRange && (
          <p className="text-xs text-warn mt-1">Outside the normal UGX 100,000–500,000 range. An administrator will need to approve this with a reason.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Payment Date</label>
          <input className="input" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required />
        </div>
        <div>
          <label className="label">Payment Method</label>
          <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Payment Reference</label>
        <input className="input" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="Bank slip / transaction number" />
      </div>

      <div>
        <label className="label">Notes (optional)</label>
        <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div>
        <label className="label">Proof of Payment</label>
        <input
          className="input"
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          multiple
          onChange={(e) => setFiles(e.target.files)}
          required
        />
        <p className="text-[11px] text-ink/40 mt-1">JPG, PNG or PDF, up to 8MB each.</p>
      </div>

      {error && <p className="text-sm text-bad">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={loading} className="btn btn-primary flex-1">{loading ? "Submitting…" : "Submit for verification"}</button>
      </div>
    </form>
  );
}
