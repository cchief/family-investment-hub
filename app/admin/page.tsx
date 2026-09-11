import { getAdminDashboardStats, getAlerts, getMonthlySeries, getFundGrowthSeries, getComplianceTrend } from "@/lib/repo/dashboard";
import { StatCard } from "@/components/StatCard";
import { DualLineChart, StackedBarChart, CompliancePctChart, PrincipalInterestDonut } from "@/components/Charts";
import { formatUGX, formatPct, monthLabel } from "@/lib/currency";

export default async function AdminDashboardPage() {
  const stats = getAdminDashboardStats();
  const alerts = getAlerts();
  const monthly = getMonthlySeries();
  const growth = getFundGrowthSeries();
  const compliance = getComplianceTrend();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Fund Administration</h1>
        <p className="text-ink/50 text-sm mt-1">{monthLabel(stats.month, stats.year)} overview</p>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div
              key={i}
              className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2.5 ${
                a.level === "danger" ? "bg-bad/10 text-bad" : a.level === "warn" ? "bg-warn/10 text-warn" : "bg-brand-50 text-brand-700"
              }`}
            >
              <span>{a.level === "danger" ? "⚠️" : a.level === "warn" ? "⏰" : "ℹ️"}</span>
              {a.message}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total Fund Balance" value={formatUGX(stats.totalFundBalance)} accent />
        <StatCard label="Total Principal" value={formatUGX(stats.totalPrincipal)} />
        <StatCard label="Total Interest Earned" value={formatUGX(stats.totalInterest)} tone="good" />
        <StatCard label="Collection Rate" value={formatPct(stats.collectionRate)} tone={stats.collectionRate >= 90 ? "good" : stats.collectionRate >= 60 ? "warn" : "bad"} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Current Month Collections" value={formatUGX(stats.currentMonthCollections)} sub={`of ${formatUGX(stats.expectedMonthlyCollections)} expected`} />
        <StatCard label="Members Paid / Outstanding" value={`${stats.membersPaid} / ${stats.membersOutstanding}`} sub={`${stats.memberCount} active members`} />
        <StatCard label="Awaiting Verification" value={String(stats.paymentsAwaitingVerification)} sub={formatUGX(stats.amountAwaitingVerification)} tone={stats.paymentsAwaitingVerification > 0 ? "warn" : "default"} />
        <StatCard label="Awaiting UAP Transfer" value={formatUGX(stats.amountWaitingForUAP)} tone={stats.amountWaitingForUAP > 0 ? "warn" : "good"} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard label="Last UAP Transfer" value={stats.lastUapTransfer ? formatUGX(stats.lastUapTransfer.amount) : "None yet"} sub={stats.lastUapTransfer ? new Date(stats.lastUapTransfer.transfer_date).toLocaleDateString("en-GB") : undefined} />
        <StatCard label="Next UAP Transfer Deadline" value={`${stats.uapDeadline.days} day${stats.uapDeadline.days === 1 ? "" : "s"}`} sub={stats.uapDeadline.date.toLocaleDateString("en-GB", { day: "numeric", month: "long" })} tone={stats.uapDeadline.days <= 1 ? "bad" : "default"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="card p-5">
          <h2 className="font-display font-semibold text-ink mb-1">Monthly total contributions</h2>
          {monthly.length > 0 ? (
            <StackedBarChart data={monthly} keys={[{ key: "contributions", name: "Contributions", color: "#2F6B4F" }]} />
          ) : <p className="text-sm text-ink/40 py-10 text-center">No contribution history yet.</p>}
        </div>
        <div className="card p-5">
          <h2 className="font-display font-semibold text-ink mb-1">Monthly interest earned</h2>
          {monthly.length > 0 ? (
            <StackedBarChart data={monthly} keys={[{ key: "interest", name: "Interest", color: "#C79A3B" }]} />
          ) : <p className="text-sm text-ink/40 py-10 text-center">No interest allocations yet.</p>}
        </div>
        <div className="card p-5">
          <h2 className="font-display font-semibold text-ink mb-1">Fund balance growth</h2>
          {growth.length > 0 ? (
            <DualLineChart data={growth.map((g) => ({ ...g, value: g.closing_balance }))} keys={[{ key: "value", name: "Closing balance", color: "#2F6B4F" }]} />
          ) : <p className="text-sm text-ink/40 py-10 text-center">Record a monthly fund valuation to see this chart.</p>}
        </div>
        <div className="card p-5">
          <h2 className="font-display font-semibold text-ink mb-1">Contribution compliance %</h2>
          {compliance.length > 0 ? <CompliancePctChart data={compliance} /> : <p className="text-sm text-ink/40 py-10 text-center">No data yet.</p>}
        </div>
      </div>

      <div className="card p-5 max-w-sm">
        <h2 className="font-display font-semibold text-ink mb-1">Principal vs. interest</h2>
        <PrincipalInterestDonut principal={stats.totalPrincipal} interest={stats.totalInterest} />
      </div>
    </div>
  );
}
