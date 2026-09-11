"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { StatCard } from "@/components/StatCard";
import { formatUGX, monthLabel, MONTH_NAMES } from "@/lib/currency";

type Transfer = { id: string; transfer_date: string; amount: number; reference: string | null; notes: string | null };
type Valuation = {
  id: string; month: number; year: number; opening_balance: number; new_contributions: number;
  interest_earned: number; withdrawals: number; charges: number; closing_balance: number; locked: number; commentary: string | null;
};

export function UapFundClient({
  transfers, valuations, totalTransferred, suggestedContributions,
}: { transfers: Transfer[]; valuations: Valuation[]; totalTransferred: number; suggestedContributions: number }) {
  const router = useRouter();
  const [transferOpen, setTransferOpen] = useState(false);
  const [valuationOpen, setValuationOpen] = useState(false);

  const latestClose = valuations[0]?.closing_balance ?? 0;
  const totalInterest = valuations.reduce((s, v) => s + v.interest_earned, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">UAP Fund</h1>
          <p className="text-ink/50 text-sm mt-1">Transfers to UAP Umbrella Trust and month-end fund valuations.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => setValuationOpen(true)}>+ Record Valuation</button>
          <button className="btn btn-gold" onClick={() => setTransferOpen(true)}>+ Record UAP Transfer</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total Transferred to UAP" value={formatUGX(totalTransferred)} accent />
        <StatCard label="Latest Closing Balance" value={formatUGX(latestClose)} />
        <StatCard label="Cumulative Interest" value={formatUGX(totalInterest)} tone="good" />
        <StatCard label="Fund Growth" value={valuations.length > 1 ? `${(((latestClose - valuations[valuations.length - 1].closing_balance) / Math.max(1, valuations[valuations.length - 1].closing_balance)) * 100).toFixed(1)}%` : "—"} />
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-black/5"><h2 className="font-display font-semibold text-ink">Transfers to UAP</h2></div>
        <div className="overflow-x-auto">
          <table className="table-clean">
            <thead><tr><th>Date</th><th>Amount</th><th>Reference</th><th>Notes</th></tr></thead>
            <tbody>
              {transfers.length === 0 && <tr><td colSpan={4} className="text-center text-ink/40 py-8">No transfers recorded yet.</td></tr>}
              {transfers.map((t) => (
                <tr key={t.id}>
                  <td className="text-ink/60">{new Date(t.transfer_date).toLocaleDateString("en-GB")}</td>
                  <td className="tabular-nums font-medium">{formatUGX(t.amount)}</td>
                  <td className="text-ink/60">{t.reference || "—"}</td>
                  <td className="text-ink/60">{t.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-black/5"><h2 className="font-display font-semibold text-ink">Monthly fund valuations</h2></div>
        <div className="overflow-x-auto">
          <table className="table-clean">
            <thead><tr><th>Month</th><th>Opening</th><th>New Contributions</th><th>Interest</th><th>Withdrawals</th><th>Charges</th><th>Closing</th><th></th></tr></thead>
            <tbody>
              {valuations.length === 0 && <tr><td colSpan={8} className="text-center text-ink/40 py-8">No valuations recorded yet.</td></tr>}
              {valuations.map((v) => (
                <tr key={v.id}>
                  <td className="font-medium text-ink">{monthLabel(v.month, v.year)} {v.locked ? <span className="badge badge-neutral ml-1">🔒 Locked</span> : null}</td>
                  <td className="tabular-nums">{formatUGX(v.opening_balance)}</td>
                  <td className="tabular-nums text-good">{formatUGX(v.new_contributions)}</td>
                  <td className="tabular-nums text-good">{formatUGX(v.interest_earned)}</td>
                  <td className="tabular-nums text-bad">{v.withdrawals ? formatUGX(-v.withdrawals) : "—"}</td>
                  <td className="tabular-nums text-bad">{v.charges ? formatUGX(-v.charges) : "—"}</td>
                  <td className="tabular-nums font-semibold">{formatUGX(v.closing_balance)}</td>
                  <td>{!v.locked && <LockButton id={v.id} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {transferOpen && <TransferModal onClose={() => { setTransferOpen(false); router.refresh(); }} />}
      {valuationOpen && (
        <ValuationModal
          onClose={() => { setValuationOpen(false); router.refresh(); }}
          suggestedOpening={latestClose}
          suggestedContributions={suggestedContributions}
        />
      )}
    </div>
  );
}

function LockButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button
      className="text-xs font-semibold text-ink/40 hover:text-ink"
      onClick={async () => {
        if (!confirm("Lock this month? Further changes will require a documented correction.")) return;
        await fetch(`/api/fund-valuations/${id}/lock`, { method: "POST" });
        router.refresh();
      }}
    >
      Lock month
    </button>
  );
}

function TransferModal({ onClose }: { onClose: () => void }) {
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState(0);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData();
    fd.set("transferDate", transferDate);
    fd.set("amount", String(amount));
    fd.set("reference", reference);
    fd.set("notes", notes);
    if (file) fd.set("document", file);
    const res = await fetch("/api/fund-transfers", { method: "POST", body: fd });
    setLoading(false);
    if (!res.ok) { setError((await res.json()).error); return; }
    onClose();
  }

  return (
    <Modal title="Record UAP Transfer" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div><label className="label">Transfer Date</label><input className="input" type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} /></div>
        <div><label className="label">Amount (UGX)</label><input className="input" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} required /></div>
        <div><label className="label">Reference</label><input className="input" value={reference} onChange={(e) => setReference(e.target.value)} /></div>
        <div><label className="label">Supporting Document</label><input className="input" type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
        <div><label className="label">Notes</label><textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        {error && <p className="text-sm text-bad">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn btn-gold flex-1">{loading ? "Saving…" : "Record Transfer"}</button>
        </div>
      </form>
    </Modal>
  );
}

function ValuationModal({
  onClose, suggestedOpening, suggestedContributions,
}: { onClose: () => void; suggestedOpening: number; suggestedContributions: number }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [openingBalance, setOpeningBalance] = useState(suggestedOpening);
  const [newContributions, setNewContributions] = useState(suggestedContributions);
  const [interestEarned, setInterestEarned] = useState(0);
  const [withdrawals, setWithdrawals] = useState(0);
  const [charges, setCharges] = useState(0);
  const [commentary, setCommentary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const closing = openingBalance + newContributions + interestEarned - withdrawals - charges;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/fund-valuations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, year, openingBalance, newContributions, interestEarned, withdrawals, charges, commentary }),
    });
    setLoading(false);
    if (!res.ok) { setError((await res.json()).error); return; }
    onClose();
  }

  return (
    <Modal title="Record Monthly Fund Valuation" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Month</label><select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></div>
          <div><label className="label">Year</label><input className="input" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div>
        </div>
        <div><label className="label">Opening Fund Balance</label><input className="input" type="number" value={openingBalance} onChange={(e) => setOpeningBalance(Number(e.target.value))} /></div>
        <div><label className="label">New Contributions</label><input className="input" type="number" value={newContributions} onChange={(e) => setNewContributions(Number(e.target.value))} /><p className="text-[11px] text-ink/40 mt-1">Prefilled from approved contributions this month — adjust if needed.</p></div>
        <div><label className="label">Interest / Investment Return</label><input className="input" type="number" value={interestEarned} onChange={(e) => setInterestEarned(Number(e.target.value))} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Withdrawals</label><input className="input" type="number" value={withdrawals} onChange={(e) => setWithdrawals(Number(e.target.value))} /></div>
          <div><label className="label">Charges</label><input className="input" type="number" value={charges} onChange={(e) => setCharges(Number(e.target.value))} /></div>
        </div>
        <div className="rounded-xl bg-brand-50 px-3.5 py-2.5 text-sm flex justify-between"><span className="text-ink/60">Closing balance</span><span className="font-semibold">{formatUGX(closing)}</span></div>
        <div><label className="label">Commentary</label><textarea className="input" rows={2} value={commentary} onChange={(e) => setCommentary(e.target.value)} /></div>
        {error && <p className="text-sm text-bad">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn btn-primary flex-1">{loading ? "Saving…" : "Save Valuation"}</button>
        </div>
      </form>
    </Modal>
  );
}
