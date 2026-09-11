import { all, one, run } from "../db";
import { newId } from "../ids";
import { getMemberBalance, getMemberPrincipal, getMemberInterest, postTransaction } from "../ledger";
import { logAudit } from "../audit";
import { hashPassword } from "../auth";

export interface MemberRow {
  id: string;
  member_code: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  join_date: string;
  monthly_commitment: number;
  status: "ACTIVE" | "INACTIVE";
  opening_balance: number;
  created_at: string;
}

export interface MemberWithEmail extends MemberRow {
  email: string;
}

export function listMembers(): MemberWithEmail[] {
  return all<MemberWithEmail>(
    `SELECT m.*, u.email FROM members m JOIN users u ON u.id = m.user_id ORDER BY m.full_name ASC`
  );
}

export function getMember(memberId: string): MemberWithEmail | undefined {
  return one<MemberWithEmail>(
    `SELECT m.*, u.email FROM members m JOIN users u ON u.id = m.user_id WHERE m.id = :memberId`,
    { memberId }
  );
}

export function nextMemberCode(): string {
  const row = one<{ n: number }>(`SELECT COUNT(*) as n FROM members`);
  const seq = (row?.n ?? 0) + 1;
  return `FIH-${String(seq).padStart(3, "0")}`;
}

export function createMember(params: {
  actorId: string;
  fullName: string;
  email: string;
  phone?: string;
  joinDate: string;
  monthlyCommitment: number;
  openingBalance?: number;
  temporaryPassword: string;
  role?: "MEMBER" | "ADMIN";
}): { memberId: string; userId: string } {
  const userId = newId("user");
  const memberId = newId("mem");
  const memberCode = nextMemberCode();

  run(
    `INSERT INTO users (id, email, password_hash, role) VALUES (:id, :email, :hash, :role)`,
    { id: userId, email: params.email.trim().toLowerCase(), hash: "PENDING", role: params.role ?? "MEMBER" }
  );

  run(
    `INSERT INTO members (id, member_code, user_id, full_name, phone, join_date, monthly_commitment, opening_balance)
     VALUES (:id, :memberCode, :userId, :fullName, :phone, :joinDate, :monthlyCommitment, :openingBalance)`,
    {
      id: memberId,
      memberCode,
      userId,
      fullName: params.fullName,
      phone: params.phone ?? null,
      joinDate: params.joinDate,
      monthlyCommitment: params.monthlyCommitment,
      openingBalance: params.openingBalance ?? 0,
    }
  );

  if (params.openingBalance && params.openingBalance !== 0) {
    const jd = new Date(params.joinDate);
    postTransaction({
      memberId,
      type: "OPENING_BALANCE",
      amount: params.openingBalance,
      month: jd.getUTCMonth() + 1,
      year: jd.getUTCFullYear(),
      description: "Opening balance on joining the fund",
    });
  }

  logAudit({
    actorId: params.actorId,
    action: "MEMBER_CREATED",
    entityType: "Member",
    entityId: memberId,
    newValue: { fullName: params.fullName, email: params.email, monthlyCommitment: params.monthlyCommitment },
  });

  return { memberId, userId };
}

export async function setMemberPassword(userId: string, plainPassword: string) {
  const hash = await hashPassword(plainPassword);
  run(`UPDATE users SET password_hash = :hash, updated_at = datetime('now') WHERE id = :userId`, { userId, hash });
}

export function updateMember(params: {
  actorId: string;
  memberId: string;
  fullName?: string;
  phone?: string;
  monthlyCommitment?: number;
  status?: "ACTIVE" | "INACTIVE";
}) {
  const before = getMember(params.memberId);
  if (!before) throw new Error("Member not found");

  run(
    `UPDATE members SET
       full_name = COALESCE(:fullName, full_name),
       phone = COALESCE(:phone, phone),
       monthly_commitment = COALESCE(:monthlyCommitment, monthly_commitment),
       status = COALESCE(:status, status),
       updated_at = datetime('now')
     WHERE id = :memberId`,
    {
      memberId: params.memberId,
      fullName: params.fullName ?? null,
      phone: params.phone ?? null,
      monthlyCommitment: params.monthlyCommitment ?? null,
      status: params.status ?? null,
    }
  );

  logAudit({
    actorId: params.actorId,
    action: "MEMBER_UPDATED",
    entityType: "Member",
    entityId: params.memberId,
    previousValue: before,
    newValue: params,
  });
}

export function getMemberSummary(memberId: string) {
  const balance = getMemberBalance(memberId);
  const principal = getMemberPrincipal(memberId);
  const interest = getMemberInterest(memberId);
  return { balance, principal, interest };
}

export function setMonthlyCommitmentOverride(params: {
  actorId: string;
  memberId: string;
  month: number;
  year: number;
  expectedAmount: number;
  note?: string;
}) {
  const existing = one<{ id: string }>(
    `SELECT id FROM monthly_commitments WHERE member_id = :memberId AND month = :month AND year = :year`,
    { memberId: params.memberId, month: params.month, year: params.year }
  );
  if (existing) {
    run(
      `UPDATE monthly_commitments SET expected_amount = :amount, note = :note WHERE id = :id`,
      { id: existing.id, amount: params.expectedAmount, note: params.note ?? null }
    );
  } else {
    run(
      `INSERT INTO monthly_commitments (id, member_id, month, year, expected_amount, note)
       VALUES (:id, :memberId, :month, :year, :amount, :note)`,
      { id: newId("mc"), memberId: params.memberId, month: params.month, year: params.year, amount: params.expectedAmount, note: params.note ?? null }
    );
  }
  logAudit({
    actorId: params.actorId,
    action: "MONTHLY_COMMITMENT_OVERRIDE",
    entityType: "Member",
    entityId: params.memberId,
    newValue: params,
  });
}

export function getExpectedAmount(memberId: string, month: number, year: number): number {
  const override = one<{ expected_amount: number }>(
    `SELECT expected_amount FROM monthly_commitments WHERE member_id = :memberId AND month = :month AND year = :year`,
    { memberId, month, year }
  );
  if (override) return override.expected_amount;
  const m = one<{ monthly_commitment: number }>(`SELECT monthly_commitment FROM members WHERE id = :memberId`, { memberId });
  return m?.monthly_commitment ?? 0;
}
