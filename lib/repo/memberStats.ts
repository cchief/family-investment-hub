import { all, one } from "../db";
import { getMemberBalance, getMemberPrincipal, getMemberInterest } from "../ledger";
import { getExpectedAmount } from "./members";
import { getCurrentPeriod, daysUntil } from "./dashboard";
import { getSetting } from "./settings";

export function getMemberDashboard(memberId: string) {
  const { month, year } = getCurrentPeriod();
  const balance = getMemberBalance(memberId);
  const principal = getMemberPrincipal(memberId);
  const interest = getMemberInterest(memberId);

  const currentMonthContribution = one<{ id: string; amount: number; status: string }>(
    `SELECT id, amount, status FROM contributions WHERE member_id = :memberId AND month = :month AND year = :year
     ORDER BY created_at DESC LIMIT 1`,
    { memberId, month, year }
  );

  const status: "PAID" | "PENDING_VERIFICATION" | "NOT_PAID" | "REJECTED" =
    currentMonthContribution?.status === "APPROVED" ? "PAID" :
    currentMonthContribution?.status === "PENDING_VERIFICATION" ? "PENDING_VERIFICATION" :
    currentMonthContribution?.status === "REJECTED" ? "REJECTED" : "NOT_PAID";

  const joinRow = one<{ join_date: string }>(`SELECT join_date FROM members WHERE id = :memberId`, { memberId });
  const joinDate = joinRow ? new Date(joinRow.join_date) : new Date();
  const now = new Date();
  const monthsSinceJoin = Math.max(
    1,
    (now.getUTCFullYear() - joinDate.getUTCFullYear()) * 12 + (now.getUTCMonth() - joinDate.getUTCMonth()) + 1
  );

  const monthsContributed = one<{ n: number }>(
    `SELECT COUNT(DISTINCT (year || '-' || month)) as n FROM contributions WHERE member_id = :memberId AND status = 'APPROVED'`,
    { memberId }
  )!.n;

  const consistency = Math.min(100, (monthsContributed / monthsSinceJoin) * 100);

  const lastContribution = one<{ amount: number; payment_date: string; month: number; year: number }>(
    `SELECT amount, payment_date, month, year FROM contributions WHERE member_id = :memberId AND status = 'APPROVED'
     ORDER BY year DESC, month DESC LIMIT 1`,
    { memberId }
  );

  const recentTransactions = all(
    `SELECT * FROM transactions WHERE member_id = :memberId ORDER BY created_at DESC LIMIT 8`,
    { memberId }
  );

  const trend = all<{ month: number; year: number; amount: number }>(
    `SELECT month, year, SUM(amount) as amount FROM transactions WHERE member_id = :memberId AND type = 'CONTRIBUTION'
     GROUP BY year, month ORDER BY year ASC, month ASC`,
    { memberId }
  );

  return {
    balance, principal, interest,
    currentMonth: { month, year, contribution: currentMonthContribution ?? null, status, expected: getExpectedAmount(memberId, month, year) },
    nextDeadline: daysUntil(Number(getSetting("MEMBER_DEADLINE_DAY")) || 10),
    monthsContributed,
    consistency,
    lastContribution: lastContribution ?? null,
    recentTransactions,
    trend,
  };
}
