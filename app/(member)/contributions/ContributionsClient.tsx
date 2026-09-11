"use client";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { UploadContributionForm } from "@/components/UploadContributionForm";
import { StatusBadge } from "@/components/StatusBadge";
import { formatUGX, monthLabel } from "@/lib/currency";

export function ContributionsClient({ contributions }: { contributions: any[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(params.get("upload") === "1");

  function close() {
    setOpen(false);
    router.replace("/contributions");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">My Contributions</h1>
          <p className="text-ink/50 text-sm mt-1">Submit proof of payment each month and track verification status.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>+ Upload Contribution</button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-clean">
            <thead>
              <tr>
                <th>Month</th><th>Amount</th><th>Payment Date</th><th>Method</th><th>Reference</th><th>Status</th><th>Details</th>
              </tr>
            </thead>
            <tbody>
              {contributions.length === 0 && (
                <tr><td colSpan={7} className="text-center text-ink/40 py-10">No contributions submitted yet.</td></tr>
              )}
              {contributions.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium text-ink">{monthLabel(c.month, c.year)}</td>
                  <td className="tabular-nums">{formatUGX(c.amount)}</td>
                  <td className="text-ink/60">{new Date(c.payment_date).toLocaleDateString("en-GB")}</td>
                  <td className="text-ink/60">{c.payment_method}</td>
                  <td className="text-ink/60">{c.payment_reference || "—"}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td className="text-ink/50 text-xs max-w-[220px]">
                    {c.status === "REJECTED" && c.rejection_reason ? `Reason: ${c.rejection_reason}` : c.verified_by_name ? `Verified by ${c.verified_by_name}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <Modal title="Upload Contribution" onClose={close}>
          <UploadContributionForm onClose={close} />
        </Modal>
      )}
    </div>
  );
}
