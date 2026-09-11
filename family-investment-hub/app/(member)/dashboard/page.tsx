import { requireMember } from "@/lib/session";
import { getMemberDashboard } from "@/lib/repo/memberStats";
import { getMember } from "@/lib/repo/members";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { ContributionTrendChart } from "@/components/Charts";
import { formatUGX, monthLabel, formatPct } from "@/lib/currency";
import Link from "next/link";

export default async function MemberDashboardPage() {
  const user = await requireMember();
  const member = getMember(user.memberId!);
  const data = getMemberDashboard(user.memberId!);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Welcome back, {member?.full_name.split(" ")[0]}</h1>
          <p className="text-ink/50 text-sm mt-1">{member?.member_code} · Member since {new Date(member?.join_date ?? "").toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</p>
        </div>
        <Link href="/contributions?upload=1" className="btn btn-primary">+ Upload Contribution</Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Current Balance" value={formatUGX(data.balance)} accent />
        <StatCard label="Total Principal Contributed" value={formatUGX(data.principal)} />
        <StatCard label="Total Interest Earned" value={formatUGX(data.interest)} tone="good" />
        <StatCard
          label={`${monthLabel(data.currentMonth.month, data.currentMonth.year)} Contribution`}
          value={data.currentMonth.contribution ? formatUGX(data.currentMonth.contribution.amount) : "Not submitted"}
          sub={`Expected ${formatUGX(data.currentMonth.expected)}`}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display font-semibold text-ink">Contribution trend</h2>
          </div>
          <p className="text-xs text-ink/45 mb-3">Approved contributions posted to your balance, by month</p>
          {data.trend.length > 0 ? (
            <ContributionTrendChart data={data.trend} />
          ) : (
            <p className="text-sm text-ink/40 py-10 text-center">No approved contributions yet.</p>
          )}
        </div>

        <div className="card p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/45 mb-1.5">This month's status</p>
            <StatusBadge status={data.currentMonth.status} />
          </div>
          <div className="h-px bg-black/5" />
          <div>
            <p className="text-xs text-ink/45">Next contribution deadline</p>
            <p className="font-display font-semibold text-ink mt-0.5">
              {data.nextDeadline.date.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
              <span className="text-ink/40 font-sans font-normal text-sm ml-1.5">({data.nextDeadline.days} day{data.nextDeadline.days === 1 ? "" : "s"})</span>
            </p>
          </div>
          <div className="h-px bg-black/5" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-ink/45">Months contributed</p>
              <p className="font-display font-semibold text-ink mt-0.5">{data.monthsContributed}</p>
            </div>
            <div>
              <p className="text-xs text-ink/45">Consistency</p>
              <p className="font-display font-semibold text-ink mt-0.5">{formatPct(data.consistency, 0)}</p>
            </div>
          </div>
          <div className="h-px bg-black/5" />
          <div>
            <p className="text-xs text-ink/45">Last contribution</p>
            {data.lastContribution ? (
              <p className="text-sm text-ink mt-0.5">
                {formatUGX(data.lastContribution.amount)} · {monthLabel(data.lastContribution.month, data.lastContribution.year)}
              </p>
            ) : (
              <p className="text-sm text-ink/40 mt-0.5">None yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-display font-semibold text-ink mb-3">Recent transactions</h2>
        <div className="overflow-x-auto">
          <table className="table-clean">
            <thead>
              <tr><th>Date</th><th>Type</th><th>Description</th><th className="text-right">Amount</th></tr>
            </thead>
            <tbody>
              {data.recentTransactions.length === 0 && (
                <tr><td colSpan={4} className="text-center text-ink/40 py-6">No transactions yet.</td></tr>
              )}
              {data.recentTransactions.map((t: any) => (
                <tr key={t.id}>
                  <td className="text-ink/60">{new Date(t.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                  <td className="text-ink/70">{t.type.replace("_", " ")}</td>
                  <td className="text-ink/70">{t.description}</td>
                  <td className={`text-right font-medium tabular-nums ${t.amount < 0 ? "text-bad" : "text-ink"}`}>{formatUGX(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
