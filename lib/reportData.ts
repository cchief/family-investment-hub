import { one, all } from "./db";
import { getFundTotalsAsOf } from "./ledger";
import { getFundValuation } from "./repo/fund";

export function buildMonthlyReportData(month: number, year: number) {
  const valuation = getFundValuation(month, year);

  const totalMembers = one<{ n: number }>(`SELECT COUNT(*) as n FROM members WHERE status='ACTIVE'`)!.n;
  const contributed = one<{ n: number; total: number | null }>(
    `SELECT COUNT(DISTINCT member_id) as n, SUM(amount) as total FROM contributions WHERE month=:month AND year=:year AND status='APPROVED'`,
    { month, year }
  )!;
  const compliance = totalMembers > 0 ? (contributed.n / totalMembers) * 100 : 0;

  const outstanding = all<{ full_name: string; expected: number }>(
    `SELECT m.full_name, COALESCE(mc.expected_amount, m.monthly_commitment) as expected
     FROM members m
     LEFT JOIN monthly_commitments mc ON mc.member_id = m.id AND mc.month=:month AND mc.year=:year
     WHERE m.status='ACTIVE' AND NOT EXISTS (
       SELECT 1 FROM contributions c WHERE c.member_id=m.id AND c.month=:month AND c.year=:year AND c.status='APPROVED'
     )`,
    { month, year }
  );

  const memberSummary = all<{ full_name: string; member_code: string; amount: number | null; status: string | null }>(
    `SELECT m.full_name, m.member_code, c.amount, c.status
     FROM members m
     LEFT JOIN contributions c ON c.member_id = m.id AND c.month=:month AND c.year=:year AND c.status != 'REJECTED'
     WHERE m.status='ACTIVE' ORDER BY m.full_name`,
    { month, year }
  );

  const transferred = one<{ total: number | null }>(
    `SELECT SUM(amount) as total FROM fund_transfers WHERE strftime('%Y-%m', transfer_date) = :ym`,
    { ym: `${year}-${String(month).padStart(2, "0")}` }
  )!.total ?? 0;

  const totalsAsOf = getFundTotalsAsOf(month, year);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevValuation = getFundValuation(prevMonth, prevYear);
  const momGrowth = prevValuation && prevValuation.closing_balance > 0
    ? ((valuation?.closing_balance ?? totalsAsOf.total) - prevValuation.closing_balance) / prevValuation.closing_balance * 100
    : null;

  return {
    month, year,
    openingBalance: valuation?.opening_balance ?? prevValuation?.closing_balance ?? 0,
    totalContributions: valuation?.new_contributions ?? contributed.total ?? 0,
    totalMembers,
    membersContributed: contributed.n,
    compliance,
    amountTransferred: transferred,
    interestEarned: valuation?.interest_earned ?? 0,
    closingBalance: valuation?.closing_balance ?? totalsAsOf.total,
    momGrowth,
    principal: totalsAsOf.principal,
    interest: totalsAsOf.interest,
    outstanding,
    memberSummary,
  };
}

export type MonthlyReportData = ReturnType<typeof buildMonthlyReportData>;
