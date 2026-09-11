"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { StatusBadge } from "@/components/StatusBadge";
import { formatUGX } from "@/lib/currency";

type Member = {
  id: string; member_code: string; full_name: string; email: string; phone: string | null;
  join_date: string; monthly_commitment: number; status: string; balance: number;
};

export function MembersClient({ members }: { members: Member[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [search, setSearch] = useState("");

  const filtered = members.filter((m) => m.full_name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Members</h1>
          <p className="text-ink/50 text-sm mt-1">{members.length} members ({members.filter((m) => m.status === "ACTIVE").length} active)</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>+ Add Member</button>
      </div>

      <input className="input max-w-xs" placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-clean">
            <thead>
              <tr><th>Member</th><th>Email</th><th>Monthly Commitment</th><th>Balance</th><th>Status</th><th>Joined</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id}>
                  <td className="font-medium text-ink">{m.full_name} <span className="text-ink/35 font-normal">· {m.member_code}</span></td>
                  <td className="text-ink/60">{m.email}</td>
                  <td className="tabular-nums">{formatUGX(m.monthly_commitment)}</td>
                  <td className="tabular-nums font-medium">{formatUGX(m.balance)}</td>
                  <td><StatusBadge status={m.status} /></td>
                  <td className="text-ink/60">{new Date(m.join_date).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</td>
                  <td><button className="text-xs font-semibold text-brand-600" onClick={() => setEditing(m)}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {open && <AddMemberModal onClose={() => { setOpen(false); router.refresh(); }} />}
      {editing && <EditMemberModal member={editing} onClose={() => { setEditing(null); router.refresh(); }} />}
    </div>
  );
}

function AddMemberModal({ onClose }: { onClose: () => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [joinDate, setJoinDate] = useState(new Date().toISOString().slice(0, 10));
  const [monthlyCommitment, setMonthlyCommitment] = useState(200000);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [temporaryPassword, setTemporaryPassword] = useState("Member123!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, phone, joinDate, monthlyCommitment, openingBalance, temporaryPassword }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error);
      return;
    }
    onClose();
  }

  return (
    <Modal title="Add Member" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div><label className="label">Full Name</label><input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
        <div><label className="label">Email</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div><label className="label">Phone</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Join Date</label><input className="input" type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} /></div>
          <div><label className="label">Monthly Commitment</label><input className="input" type="number" value={monthlyCommitment} onChange={(e) => setMonthlyCommitment(Number(e.target.value))} /></div>
        </div>
        <div><label className="label">Opening Balance (if joining with existing credit)</label><input className="input" type="number" value={openingBalance} onChange={(e) => setOpeningBalance(Number(e.target.value))} /></div>
        <div><label className="label">Temporary Password</label><input className="input" value={temporaryPassword} onChange={(e) => setTemporaryPassword(e.target.value)} /></div>
        {error && <p className="text-sm text-bad">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn btn-primary flex-1">{loading ? "Creating…" : "Create Member"}</button>
        </div>
      </form>
    </Modal>
  );
}

function EditMemberModal({ member, onClose }: { member: Member; onClose: () => void }) {
  const [fullName, setFullName] = useState(member.full_name);
  const [phone, setPhone] = useState(member.phone ?? "");
  const [monthlyCommitment, setMonthlyCommitment] = useState(member.monthly_commitment);
  const [status, setStatus] = useState(member.status);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch(`/api/members/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, phone, monthlyCommitment, status }),
    });
    setLoading(false);
    onClose();
  }

  return (
    <Modal title={`Edit ${member.full_name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div><label className="label">Full Name</label><input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
        <div><label className="label">Phone</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div><label className="label">Monthly Commitment</label><input className="input" type="number" value={monthlyCommitment} onChange={(e) => setMonthlyCommitment(Number(e.target.value))} /></div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <p className="text-[11px] text-ink/40 mt-1">Inactive members keep their full transaction history; they're just excluded from new-month compliance checks.</p>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn btn-primary flex-1">{loading ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}
