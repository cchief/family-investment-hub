"use client";
import { useState } from "react";

export function SettingsForm({ settings }: { settings: Record<string, string> }) {
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-4">
      <div>
        <label className="label">Fund / Investment Product Name</label>
        <input className="input" value={form.FUND_NAME} onChange={(e) => setForm((f) => ({ ...f, FUND_NAME: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Minimum Monthly Contribution (UGX)</label>
          <input className="input" type="number" value={form.MIN_CONTRIBUTION} onChange={(e) => setForm((f) => ({ ...f, MIN_CONTRIBUTION: e.target.value }))} />
        </div>
        <div>
          <label className="label">Maximum Monthly Contribution (UGX)</label>
          <input className="input" type="number" value={form.MAX_CONTRIBUTION} onChange={(e) => setForm((f) => ({ ...f, MAX_CONTRIBUTION: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Member Contribution Deadline (day of month)</label>
          <input className="input" type="number" min={1} max={28} value={form.MEMBER_DEADLINE_DAY} onChange={(e) => setForm((f) => ({ ...f, MEMBER_DEADLINE_DAY: e.target.value }))} />
        </div>
        <div>
          <label className="label">UAP Transfer Deadline (day of month)</label>
          <input className="input" type="number" min={1} max={28} value={form.UAP_TRANSFER_DEADLINE_DAY} onChange={(e) => setForm((f) => ({ ...f, UAP_TRANSFER_DEADLINE_DAY: e.target.value }))} />
        </div>
      </div>
      <button className="btn btn-primary" disabled={loading}>{saved ? "Saved ✓" : loading ? "Saving…" : "Save Settings"}</button>
    </form>
  );
}
