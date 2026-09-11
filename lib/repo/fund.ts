import { all, one, run, withTransaction } from "../db";
import { newId } from "../ids";
import { postTransaction, getMemberBalance } from "../ledger";
import { logAudit } from "../audit";
import { notify } from "./notifications";

export interface FundTransferRow {
  id: string;
  transfer_date: string;
  amount: number;
  reference: string | null;
  transferred_by_id: string;
  document_id: string | null;
  notes: string | null;
  created_at: string;
}

export function recordFundTransfer(params: {
  actorId: string;
  transferDate: string;
  amount: number;
  reference?: string;
  documentId?: string;
  notes?: string;
}): string {
  if (params.amount <= 0) throw new Error("Transfer amount must be positive");
  const id = newId("xfer");
  run(
    `INSERT INTO fund_transfers (id, transfer_date, amount, reference, transferred_by_id, document_id, notes)
     VALUES (:id, :transferDate, :amount, :reference, :actorId, :documentId, :notes)`,
    {
      id,
      transferDate: params.transferDate,
      amount: params.amount,
      reference: params.reference ?? null,
      actorId: params.actorId,
      documentId: params.documentId ?? null,
      notes: params.notes ?? null,
    }
  );
  logAudit({ actorId: params.actorId, action: "UAP_TRANSFER_RECORDED", entityType: "FundTransfer", entityId: id, newValue: params });
  return id;
}

export function listFundTransfers(): FundTransferRow[] {
  return all<FundTransferRow>(`SELECT * FROM fund_transfers ORDER BY transfer_date DESC`);
}

export function getTotalTransferred(): number {
  const row = one<{ total: number | null }>(`SELECT SUM(amount) as total FROM fund_transfers`);
  return row?.total ?? 0;
}

export function getLastTransfer(): FundTransferRow | undefined {
  return one<FundTransferRow>(`SELECT * FROM fund_transfers ORDER BY transfer_date DESC LIMIT 1`);
}

// ---------------- Fund valuation (monthly close) ----------------

export interface FundValuationRow {
  id: string;
  month: number;
  year: number;
  opening_balance: number;
  new_contributions: number;
  interest_earned: number;
  withdrawals: number;
  charges: number;
  closing_balance: number;
  commentary: string | null;
  locked: number;
  recorded_by_id: string;
  created_at: string;
}

export function listFundValuations(): FundValuationRow[] {
  return all<FundValuationRow>(`SELECT * FROM fund_valuations ORDER BY year DESC, month DESC`);
}

export function getFundValuation(month: number, year: number): FundValuationRow | undefined {
  return one<FundValuationRow>(`SELECT * FROM fund_valuations WHERE month = :month AND year = :year`, { month, year });
}

export function getLatestFundValuation(): FundValuationRow | undefined {
  return one<FundValuationRow>(`SELECT * FROM fund_valuations ORDER BY year DESC, month DESC LIMIT 1`);
}

/** Sum of approved contributions posted for a given month (used to prefill "new contributions"). */
export function getApprovedContributionsTotal(month: number, year: number): number {
  const row = one<{ total: number | null }>(
    `SELECT SUM(amount) as total FROM contributions WHERE month = :month AND year = :year AND status = 'APPROVED'`,
    { month, year }
  );
  return row?.total ?? 0;
}

export function recordFundValuation(params: {
  actorId: string;
  month: number;
  year: number;
  openingBalance: number;
  newContributions: number;
  interestEarned: number;
  withdrawals?: number;
  charges?: number;
  commentary?: string;
}): { id: string; closingBalance: number } {
  const withdrawals = params.withdrawals ?? 0;
  const charges = params.charges ?? 0;
  const closingBalance = params.openingBalance + params.newContributions + params.interestEarned - withdrawals - charges;

  const existing = getFundValuation(params.month, params.year);
  if (existing?.locked) {
    throw new Error("This month is locked. Use a correction with a reason instead of overwriting a locked valuation.");
  }

  const id = existing?.id ?? newId("fval");
  if (existing) {
    run(
      `UPDATE fund_valuations SET opening_balance = :ob, new_contributions = :nc, interest_earned = :ie,
         withdrawals = :w, charges = :ch, closing_balance = :cb, commentary = :commentary, updated_at = datetime('now')
       WHERE id = :id`,
      { id, ob: params.openingBalance, nc: params.newContributions, ie: params.interestEarned, w: withdrawals, ch: charges, cb: closingBalance, commentary: params.commentary ?? null }
    );
    logAudit({
      actorId: params.actorId,
      action: "FUND_VALUATION_UPDATED",
      entityType: "FundValuation",
      entityId: id,
      previousValue: existing,
      newValue: { ...params, closingBalance },
    });
  } else {
    run(
      `INSERT INTO fund_valuations (id, month, year, opening_balance, new_contributions, interest_earned, withdrawals, charges, closing_balance, commentary, recorded_by_id)
       VALUES (:id, :month, :year, :ob, :nc, :ie, :w, :ch, :cb, :commentary, :actorId)`,
      { id, month: params.month, year: params.year, ob: params.openingBalance, nc: params.newContributions, ie: params.interestEarned, w: withdrawals, ch: charges, cb: closingBalance, commentary: params.commentary ?? null, actorId: params.actorId }
    );
    logAudit({
      actorId: params.actorId,
      action: "FUND_VALUATION_RECORDED",
      entityType: "FundValuation",
      entityId: id,
      newValue: { ...params, closingBalance },
    });
  }
  return { id, closingBalance };
}

export function lockFundValuation(id: string, actorId: string) {
  run(`UPDATE fund_valuations SET locked = 1, updated_at = datetime('now') WHERE id = :id`, { id });
  logAudit({ actorId, action: "FUND_VALUATION_LOCKED", entityType: "FundValuation", entityId: id });
}

// ---------------- Interest allocation ----------------

/**
 * Proportional model: split interestEarned across ACTIVE members by their
 * balance share *as of the start of the month* (their closing balance from
 * the prior transactions, before this month's own contribution/interest is
 * posted) — this avoids rewarding a contribution with interest earned
 * before it existed.
 */
export function previewProportionalAllocation(fundValuationId: string): { memberId: string; fullName: string; balanceBefore: number; amount: number }[] {
  const fv = one<FundValuationRow>(`SELECT * FROM fund_valuations WHERE id = :id`, { id: fundValuationId });
  if (!fv) throw new Error("Fund valuation not found");

  const members = all<{ id: string; full_name: string; status: string }>(`SELECT id, full_name, status FROM members WHERE status = 'ACTIVE'`);
  const balances = members.map((m) => {
    // balance from transactions strictly before this month's contribution/interest postings
    const row = one<{ total: number | null }>(
      `SELECT SUM(amount) as total FROM transactions
       WHERE member_id = :memberId AND (year < :year OR (year = :year AND month < :month))`,
      { memberId: m.id, year: fv.year, month: fv.month }
    );
    return { memberId: m.id, fullName: m.full_name, balanceBefore: Math.max(0, row?.total ?? 0) };
  });

  const totalBalance = balances.reduce((s, b) => s + b.balanceBefore, 0);
  if (totalBalance === 0) {
    // fall back to equal split if nobody had a prior balance yet (e.g. first month)
    const equalShare = Math.floor(fv.interest_earned / (balances.length || 1));
    return balances.map((b) => ({ ...b, amount: equalShare }));
  }
  let allocated = 0;
  const result = balances.map((b, idx) => {
    const isLast = idx === balances.length - 1;
    const amount = isLast
      ? fv.interest_earned - allocated
      : Math.round((b.balanceBefore / totalBalance) * fv.interest_earned);
    allocated += amount;
    return { ...b, amount };
  });
  return result;
}

export function applyInterestAllocation(params: {
  actorId: string;
  fundValuationId: string;
  method: "PROPORTIONAL" | "MANUAL";
  allocations: { memberId: string; amount: number }[];
}) {
  const fv = one<FundValuationRow>(`SELECT * FROM fund_valuations WHERE id = :id`, { id: params.fundValuationId });
  if (!fv) throw new Error("Fund valuation not found");

  const totalAllocated = params.allocations.reduce((s, a) => s + a.amount, 0);
  if (Math.abs(totalAllocated - fv.interest_earned) > params.allocations.length) {
    // allow rounding slack of ~1 UGX per member, otherwise reject
    throw new Error(`Allocations total UGX ${totalAllocated.toLocaleString()} but interest earned is UGX ${fv.interest_earned.toLocaleString()}.`);
  }

  const existing = all<{ id: string; member_id: string }>(
    `SELECT id, member_id FROM interest_allocations WHERE fund_valuation_id = :id`,
    { id: params.fundValuationId }
  );
  if (existing.length > 0) {
    throw new Error("Interest has already been allocated for this month. Delete is not permitted; contact support for a correction procedure.");
  }

  withTransaction(() => {
    for (const a of params.allocations) {
      if (a.amount === 0) continue;
      const allocId = newId("ialloc");
      run(
        `INSERT INTO interest_allocations (id, fund_valuation_id, member_id, amount, method, approved_by_id)
         VALUES (:id, :fvId, :memberId, :amount, :method, :actorId)`,
        { id: allocId, fvId: params.fundValuationId, memberId: a.memberId, amount: a.amount, method: params.method, actorId: params.actorId }
      );
      postTransaction({
        memberId: a.memberId,
        type: "INTEREST_ALLOCATION",
        amount: a.amount,
        month: fv.month,
        year: fv.year,
        description: `Interest allocation for ${fv.month}/${fv.year} (${params.method.toLowerCase()})`,
        interestAllocationId: allocId,
      });
    }
  });

  logAudit({
    actorId: params.actorId,
    action: "INTEREST_ALLOCATED",
    entityType: "FundValuation",
    entityId: params.fundValuationId,
    newValue: { method: params.method, allocations: params.allocations },
  });

  for (const a of params.allocations) {
    const member = one<{ user_id: string }>(`SELECT user_id FROM members WHERE id = :id`, { id: a.memberId });
    if (member && a.amount !== 0) {
      notify({
        userId: member.user_id,
        type: "GENERAL",
        title: "Interest allocated",
        body: `UGX ${a.amount.toLocaleString()} in investment return for ${fv.month}/${fv.year} has been added to your balance.`,
      });
    }
  }
}

export function hasAllocationForMonth(fundValuationId: string): boolean {
  const row = one<{ n: number }>(`SELECT COUNT(*) as n FROM interest_allocations WHERE fund_valuation_id = :id`, { id: fundValuationId });
  return (row?.n ?? 0) > 0;
}
