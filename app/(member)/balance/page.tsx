import { requireMember } from "@/lib/session";
import { getMemberBalance, getMemberPrincipal, getMemberInterest, getMemberBalanceHistory } from "@/lib/ledger";
import { StatCard } from "@/components/StatCard";
import { PrincipalInterestDonut, DualLineChart } from "@/components/Charts";
import { formatUGX, formatPct } from "@/lib/currency";

export default async function BalancePage() {
  const user = await requireMember();
  const memberId = user.memberId!;
  const balance = getMemberBalance(memberId);
  const principal = getMemberPrincipal(memberId);
  const interest = getMemberInterest(memberId);
  const history = getMemberBalanceHistory(memberId);
  const returnPct = principal > 0 ? (interest / principal) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">My Balance</h1>
        <p className="text-ink/50 text-sm mt-1">How your contributions and investment return have grown.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Current Balance" value={formatUGX(balance)} accent />
        <StatCard label="Total Principal" value={formatUGX(principal)} />
        <StatCard label="Total Interest Earned" value={formatUGX(interest)} tone="good" />
        <StatCard label="Return on Principal" value={formatPct(returnPct)} tone="good" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-display font-semibold text-ink mb-1">Balance growth over time</h2>
          <p className="text-xs text-ink/45 mb-3">Cumulative principal vs. interest, month by month</p>
          {history.length > 0 ? (
            <DualLineChart
              data={history}
              keys={[
                { key: "principal", name: "Principal", color: "#2F6B4F" },
                { key: "interest", name: "Interest", color: "#C79A3B" },
              ]}
            />
          ) : (
            <p className="text-sm text-ink/40 py-10 text-center">No balance history yet.</p>
          )}
        </div>
        <div className="card p-5">
          <h2 className="font-display font-semibold text-ink mb-1">Principal vs. interest</h2>
          <p className="text-xs text-ink/45 mb-3">Composition of your current balance</p>
          <PrincipalInterestDonut principal={principal} interest={interest} />
        </div>
      </div>
    </div>
  );
}
