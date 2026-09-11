import { getFundTotals } from "@/lib/ledger";
import { getFundGrowthSeries } from "@/lib/repo/dashboard";
import { getLatestFundValuation } from "@/lib/repo/fund";
import { StatCard } from "@/components/StatCard";
import { StackedBarChart, DualLineChart, PrincipalInterestDonut } from "@/components/Charts";
import { formatUGX, formatPct } from "@/lib/currency";
import { one, all } from "@/lib/db";

export default async function FundPerformancePage() {
  const fund = getFundTotals();
  const series = getFundGrowthSeries();
  const latest = getLatestFundValuation();
  const memberCount = one<{ n: number }>(`SELECT COUNT(*) as n FROM members WHERE status='ACTIVE'`)!.n;

  const returnPct = fund.principal > 0 ? (fund.interest / fund.principal) * 100 : 0;
  const first = series[0];
  const ytdStart = series.find((s) => s.year === new Date().getFullYear() && s.month === 1);
  const ytdGrowth = ytdStart && latest ? ((latest.closing_balance - ytdStart.closing_balance) / Math.max(1, ytdStart.closing_balance)) * 100 : 0;

  const monthlyReturns = all<{ month: number; year: number; interest_earned: number }>(
    `SELECT month, year, interest_earned FROM fund_valuations ORDER BY year ASC, month ASC`
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Family Fund Performance</h1>
        <p className="text-ink/50 text-sm mt-1">How the pooled fund is growing across every member.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total Fund Value" value={formatUGX(fund.total)} accent />
        <StatCard label="Total Principal Invested" value={formatUGX(fund.principal)} />
        <StatCard label="Total Investment Return" value={formatUGX(fund.interest)} tone="good" />
        <StatCard label="Return %" value={formatPct(returnPct)} tone="good" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="Year-to-Date Growth" value={formatPct(ytdGrowth)} />
        <StatCard label="Active Members" value={String(memberCount)} />
        <StatCard label="Latest Valuation" value={latest ? formatUGX(latest.closing_balance) : "—"} sub={latest ? `${latest.month}/${latest.year}` : undefined} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-display font-semibold text-ink mb-1">Fund value over time</h2>
          <p className="text-xs text-ink/45 mb-3">Closing fund balance at each month-end close</p>
          {series.length > 0 ? (
            <DualLineChart data={series.map((s) => ({ ...s, value: s.closing_balance }))} keys={[{ key: "value", name: "Fund Balance", color: "#2F6B4F" }]} />
          ) : <p className="text-sm text-ink/40 py-10 text-center">No monthly valuations recorded yet.</p>}
        </div>
        <div className="card p-5">
          <h2 className="font-display font-semibold text-ink mb-1">Principal vs. interest</h2>
          <p className="text-xs text-ink/45 mb-3">Composition of the total fund</p>
          <PrincipalInterestDonut principal={fund.principal} interest={fund.interest} />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="card p-5">
          <h2 className="font-display font-semibold text-ink mb-1">Monthly contributions</h2>
          <p className="text-xs text-ink/45 mb-3">New contributions posted each month</p>
          {series.length > 0 ? (
            <StackedBarChart data={series.map((s) => ({ ...s, contributions: s.new_contributions }))} keys={[{ key: "contributions", name: "Contributions", color: "#2F6B4F" }]} />
          ) : <p className="text-sm text-ink/40 py-10 text-center">No data yet.</p>}
        </div>
        <div className="card p-5">
          <h2 className="font-display font-semibold text-ink mb-1">Monthly investment returns</h2>
          <p className="text-xs text-ink/45 mb-3">Interest earned at UAP each month</p>
          {monthlyReturns.length > 0 ? (
            <StackedBarChart data={monthlyReturns.map((s) => ({ ...s, interest: s.interest_earned }))} keys={[{ key: "interest", name: "Interest earned", color: "#C79A3B" }]} />
          ) : <p className="text-sm text-ink/40 py-10 text-center">No data yet.</p>}
        </div>
      </div>
    </div>
  );
}
