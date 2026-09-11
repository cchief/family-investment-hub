import { all, one, run } from "./db";
import { newId } from "./ids";

export type TxnType = "CONTRIBUTION" | "INTEREST_ALLOCATION" | "WITHDRAWAL" | "OPENING_BALANCE" | "ADJUSTMENT";

export interface Transaction {
  id: string;
  member_id: string;
  type: TxnType;
  amount: number;
  month: number;
  year: number;
  description: string;
  contribution_id: string | null;
  interest_allocation_id: string | null;
  reversal_of_id: string | null;
  created_at: string;
}

/** Post an immutable ledger entry. This is the ONLY way money moves for a member. */
export function postTransaction(params: {
  memberId: string;
  type: TxnType;
  amount: number; // signed
  month: number;
  year: number;
  description: string;
  contributionId?: string;
  interestAllocationId?: string;
  reversalOfId?: string;
}): string {
  const id = newId("txn");
  run(
    `INSERT INTO transactions (id, member_id, type, amount, month, year, description, contribution_id, interest_allocation_id, reversal_of_id)
     VALUES (:id, :memberId, :type, :amount, :month, :year, :description, :contributionId, :interestAllocationId, :reversalOfId)`,
    {
      id,
      memberId: params.memberId,
      type: params.type,
      amount: params.amount,
      month: params.month,
      year: params.year,
      description: params.description,
      contributionId: params.contributionId ?? null,
      interestAllocationId: params.interestAllocationId ?? null,
      reversalOfId: params.reversalOfId ?? null,
    }
  );
  return id;
}

/** A member's current closing balance = sum of all their transactions ever posted. */
export function getMemberBalance(memberId: string): number {
  const row = one<{ total: number | null }>(
    `SELECT SUM(amount) as total FROM transactions WHERE member_id = :memberId`,
    { memberId }
  );
  return row?.total ?? 0;
}

export function getMemberPrincipal(memberId: string): number {
  const row = one<{ total: number | null }>(
    `SELECT SUM(amount) as total FROM transactions
     WHERE member_id = :memberId AND type IN ('CONTRIBUTION','OPENING_BALANCE','ADJUSTMENT')`,
    { memberId }
  );
  return row?.total ?? 0;
}

export function getMemberInterest(memberId: string): number {
  const row = one<{ total: number | null }>(
    `SELECT SUM(amount) as total FROM transactions WHERE member_id = :memberId AND type = 'INTEREST_ALLOCATION'`,
    { memberId }
  );
  return row?.total ?? 0;
}

export function getMemberTransactions(memberId: string, opts?: { from?: string; to?: string }): Transaction[] {
  if (opts?.from && opts?.to) {
    return all<Transaction>(
      `SELECT * FROM transactions WHERE member_id = :memberId AND date(created_at) BETWEEN date(:from) AND date(:to) ORDER BY created_at ASC`,
      { memberId, from: opts.from, to: opts.to }
    );
  }
  return all<Transaction>(`SELECT * FROM transactions WHERE member_id = :memberId ORDER BY created_at ASC`, { memberId });
}

/** Fund-wide totals, always derived from the same transactions table dashboards and reports both read. */
export function getFundTotals() {
  const row = one<{ principal: number | null; interest: number | null; total: number | null }>(
    `SELECT
       SUM(CASE WHEN type IN ('CONTRIBUTION','OPENING_BALANCE','ADJUSTMENT') THEN amount ELSE 0 END) as principal,
       SUM(CASE WHEN type = 'INTEREST_ALLOCATION' THEN amount ELSE 0 END) as interest,
       SUM(amount) as total
     FROM transactions`
  );
  return {
    principal: row?.principal ?? 0,
    interest: row?.interest ?? 0,
    total: row?.total ?? 0,
  };
}

export function getFundTotalsAsOf(month: number, year: number) {
  const row = one<{ principal: number | null; interest: number | null; total: number | null }>(
    `SELECT
       SUM(CASE WHEN type IN ('CONTRIBUTION','OPENING_BALANCE','ADJUSTMENT') THEN amount ELSE 0 END) as principal,
       SUM(CASE WHEN type = 'INTEREST_ALLOCATION' THEN amount ELSE 0 END) as interest,
       SUM(amount) as total
     FROM transactions
     WHERE (year < :year) OR (year = :year AND month <= :month)`,
    { month, year }
  );
  return {
    principal: row?.principal ?? 0,
    interest: row?.interest ?? 0,
    total: row?.total ?? 0,
  };
}

export function getMemberBalanceHistory(memberId: string): { month: number; year: number; balance: number; principal: number; interest: number }[] {
  const txns = all<Transaction>(
    `SELECT * FROM transactions WHERE member_id = :memberId ORDER BY year ASC, month ASC, created_at ASC`,
    { memberId }
  );
  const points = new Map<string, { month: number; year: number; balance: number; principal: number; interest: number }>();
  let runningBalance = 0;
  let runningPrincipal = 0;
  let runningInterest = 0;
  for (const t of txns) {
    runningBalance += t.amount;
    if (t.type === "INTEREST_ALLOCATION") runningInterest += t.amount;
    else runningPrincipal += t.amount;
    const key = `${t.year}-${t.month}`;
    points.set(key, { month: t.month, year: t.year, balance: runningBalance, principal: runningPrincipal, interest: runningInterest });
  }
  return Array.from(points.values());
}
