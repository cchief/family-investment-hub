export function StatCard({
  label, value, sub, tone = "default", accent,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "good" | "warn" | "bad";
  accent?: boolean;
}) {
  const valueColor = tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : tone === "bad" ? "text-bad" : "text-ink";
  return (
    <div className={`card p-4 sm:p-5 ${accent ? "ring-1 ring-gold-500/40" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">{label}</p>
      <p className={`font-display text-2xl sm:text-[28px] font-semibold mt-1.5 ${valueColor} tabular-nums`}>{value}</p>
      {sub && <p className="text-xs text-ink/45 mt-1">{sub}</p>}
    </div>
  );
}
