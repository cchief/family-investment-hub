import { all, one } from "../db";
import { getFundTotals } from "../ledger";
import { getTotalTransferred, getLastTransfer } from "./fund";
import { getSetting } from "./settings";

export function getCurrentPeriod(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getUTCMonth() + 1, year: now.getUTCFullYear() };
}

export function daysUntil(day: number): { days: number; date: Date } {
  const now = new Date();
  let target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day));
  if (target.getTime() < Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) {
    target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, day));
  }
  const diffMs = target.getTime() - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return { days: Math.round(diffMs / 86_400_000), date: target };
}

export function getAdminDashboardStats() {
  const { month, year } = getCurrentPeriod();
  const fund = getFundTotals();

  const memberCount = one<{ n: number }>(`SELECT COUNT(*) as n FROM members WHERE status = 'ACTIVE'`)!.n;

  const collections = one<{ total: number | null; paidCount: number }>(
    `SELECT SUM(amount) as total, COUNT(DISTINCT member_id) as paidCount
     FROM contributions WHERE month = :month AND year = :year AND status = 'APPROVED'`,
    { month, year }
  )!;

  const expectedTotal = one<{ total: number | null }>(
    `SELECT SUM(COALESCE(mc.expected_amount, m.monthly_commitment)) as total
     FROM members m LEFT JOIN monthly_commitments mc ON mc.member_id = m.id AND mc.month = :month AND mc.year = :year
     WHERE m.status = 'ACTIVE'`,
    { month, year }
  )!;

  const pendingVerification = one<{ n: number; total: number | null }>(
    `SELECT COUNT(*) as n, SUM(amount) as total FROM contributions WHERE status = 'PENDING_VERIFICATION'`
  )!;

  const outstandingMembers = one<{ n: number }>(
    `SELECT COUNT(*) as n FROM members m
     WHERE m.status = 'ACTIVE' AND NOT EXISTS (
       SELECT 1 FROM contributions c WHERE c.member_id = m.id AND c.month = :month AND c.year = :year AND c.status = 'APPROVED'
     )`,
    { month, year }
  )!;

  const totalTransferred = getTotalTransferred();
  const totalApprovedEver = one<{ total: number | null }>(`SELECT SUM(amount) as total FROM contributions WHERE status = 'APPROVED'`)!.total ?? 0;
  const awaitingTransfer = Math.max(0, totalApprovedEver - totalTransferred);
  const lastTransfer = getLastTransfer();

  const collectionRate = (expectedTotal.total ?? 0) > 0 ? ((collections.total ?? 0) / (expectedTotal.total ?? 1)) * 100 : 0;

  return {
    month, year,
    totalFundBalance: fund.total,
    totalPrincipal: fund.principal,
    totalInterest: fund.interest,
    currentMonthCollections: collections.total ?? 0,
    expectedMonthlyCollections: expectedTotal.total ?? 0,
    collectionRate,
    memberCount,
    membersPaid: collections.paidCount ?? 0,
    membersOutstanding: outstandingMembers.n,
    paymentsAwaitingVerification: pendingVerification.n,
    amountAwaitingVerification: pendingVerification.total ?? 0,
    amountWaitingForUAP: awaitingTransfer,
    lastUapTransfer: lastTransfer ?? null,
    memberDeadline: daysUntil(Number(getSetting("MEMBER_DEADLINE_DAY")) || 10),
    uapDeadline: daysUntil(Number(getSetting("UAP_TRANSFER_DEADLINE_DAY")) || 15),
  };
}

export function getAlerts() {
  const stats = getAdminDashboardStats();
  const alerts: { level: "info" | "warn" | "danger"; message: string }[] = [];

  if (stats.membersOutstanding > 0 && stats.memberDeadline.days <= 3) {
    alerts.push({
      level: stats.memberDeadline.days <= 1 ? "danger" : "warn",
      message: `${stats.membersOutstanding} member${stats.membersOutstanding === 1 ? "" : "s"} ${stats.membersOutstanding === 1 ? "has" : "have"} not contributed and the deadline is in ${stats.memberDeadline.days} day${stats.memberDeadline.days === 1 ? "" : "s"}.`,
    });
  }
  if (stats.amountWaitingForUAP > 0) {
    alerts.push({
      level: stats.uapDeadline.days <= 1 ? "danger" : "info",
      message: `UGX ${stats.amountWaitingForUAP.toLocaleString()} is ready for transfer to UAP.`,
    });
  }
  if (stats.uapDeadline.days <= 1 && stats.amountWaitingForUAP > 0) {
    alerts.push({ level: "danger", message: `UAP transfer is due ${stats.uapDeadline.days === 0 ? "today" : "tomorrow"}.` });
  }
  if (stats.paymentsAwaitingVerification > 0) {
    alerts.push({ level: "warn", message: `${stats.paymentsAwaitingVerification} contribution${stats.paymentsAwaitingVerification === 1 ? "" : "s"} awaiting verification (UGX ${stats.amountAwaitingVerification.toLocaleString()}).` });
  }
  return alerts;
}

export function getMonthlySeries(monthsBack = 12) {
  return all<{ month: number; year: number; contributions: number; interest: number }>(
    `SELECT month, year,
       SUM(CASE WHEN type='CONTRIBUTION' THEN amount ELSE 0 END) as contributions,
       SUM(CASE WHEN type='INTEREST_ALLOCATION' THEN amount ELSE 0 END) as interest
     FROM transactions
     GROUP BY year, month
     ORDER BY year ASC, month ASC`
  ).slice(-monthsBack);
}

export function getFundGrowthSeries() {
  const rows = all<{ month: number; year: number; closing_balance: number; new_contributions: number; interest_earned: number }>(
    `SELECT month, year, closing_balance, new_contributions, interest_earned FROM fund_valuations ORDER BY year ASC, month ASC`
  );
  return rows;
}

export function getComplianceTrend(monthsBack = 12) {
  const rows = all<{ month: number; year: number }>(
    `SELECT DISTINCT month, year FROM transactions WHERE type='CONTRIBUTION' ORDER BY year ASC, month ASC`
  ).slice(-monthsBack);

  return rows.map(({ month, year }) => {
    const activeMembers = one<{ n: number }>(`SELECT COUNT(*) as n FROM members WHERE status = 'ACTIVE'`)!.n;
    const paid = one<{ n: number }>(
      `SELECT COUNT(DISTINCT member_id) as n FROM contributions WHERE month = :month AND year = :year AND status = 'APPROVED'`,
      { month, year }
    )!.n;
    return { month, year, compliance: activeMembers > 0 ? (paid / activeMembers) * 100 : 0 };
  });
}
