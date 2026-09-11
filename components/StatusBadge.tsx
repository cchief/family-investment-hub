const MAP: Record<string, { cls: string; label: string; dot: string }> = {
  APPROVED: { cls: "badge-good", label: "Paid & Verified", dot: "bg-good" },
  PAID: { cls: "badge-good", label: "Paid & Verified", dot: "bg-good" },
  PENDING_VERIFICATION: { cls: "badge-warn", label: "Pending Verification", dot: "bg-warn" },
  SUBMITTED: { cls: "badge-warn", label: "Submitted", dot: "bg-warn" },
  REJECTED: { cls: "badge-bad", label: "Rejected", dot: "bg-bad" },
  NOT_PAID: { cls: "badge-bad", label: "Outstanding", dot: "bg-bad" },
  ACTIVE: { cls: "badge-good", label: "Active", dot: "bg-good" },
  INACTIVE: { cls: "badge-neutral", label: "Inactive", dot: "bg-ink/30" },
  NA: { cls: "badge-neutral", label: "N/A", dot: "bg-ink/30" },
};

export function StatusBadge({ status }: { status: string }) {
  const m = MAP[status] ?? MAP.NA;
  return (
    <span className={`badge ${m.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}
