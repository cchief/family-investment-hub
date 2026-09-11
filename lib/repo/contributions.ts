import { all, one, run } from "../db";
import { newId } from "../ids";
import { postTransaction } from "../ledger";
import { logAudit } from "../audit";
import { notify } from "./notifications";
import { getSetting } from "./settings";

// Static fallbacks for UI defaults; enforcement uses getContributionLimits()
// below, which reads system_settings so an admin can change the range
// without a code change.
export const MIN_CONTRIBUTION = 100_000;
export const MAX_CONTRIBUTION = 500_000;
export const MEMBER_DEADLINE_DAY = 10;
export const UAP_TRANSFER_DEADLINE_DAY = 15;

export function getContributionLimits(): { min: number; max: number } {
  return { min: Number(getSetting("MIN_CONTRIBUTION")) || MIN_CONTRIBUTION, max: Number(getSetting("MAX_CONTRIBUTION")) || MAX_CONTRIBUTION };
}

export interface ContributionRow {
  id: string;
  member_id: string;
  month: number;
  year: number;
  amount: number;
  payment_date: string;
  payment_reference: string | null;
  payment_method: string;
  notes: string | null;
  status: "PENDING_VERIFICATION" | "APPROVED" | "REJECTED";
  limit_overridden: number;
  override_reason: string | null;
  verified_by_id: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  possible_duplicate: number;
  created_at: string;
}

export interface ContributionWithMember extends ContributionRow {
  full_name: string;
  member_code: string;
  verified_by_name: string | null;
}

function detectDuplicateReference(memberId: string, reference: string | null, excludeId?: string): boolean {
  if (!reference || !reference.trim()) return false;
  const row = one<{ n: number }>(
    `SELECT COUNT(*) as n FROM contributions
     WHERE payment_reference = :ref AND id != :excludeId AND status != 'REJECTED'`,
    { ref: reference.trim(), excludeId: excludeId ?? "" }
  );
  return (row?.n ?? 0) > 0;
}

export function submitContribution(params: {
  memberId: string;
  actorUserId: string;
  month: number;
  year: number;
  amount: number;
  paymentDate: string;
  paymentReference?: string;
  paymentMethod: string;
  notes?: string;
  evidenceDocumentIds: string[];
}): { id: string; overLimit: boolean } {
  if (params.amount <= 0) throw new Error("Contribution amount must be positive");

  const { min, max } = getContributionLimits();
  const overLimit = params.amount < min || params.amount > max;
  const isDuplicate = detectDuplicateReference(params.memberId, params.paymentReference ?? null);

  const id = newId("contrib");
  run(
    `INSERT INTO contributions (id, member_id, month, year, amount, payment_date, payment_reference, payment_method, notes, status, possible_duplicate)
     VALUES (:id, :memberId, :month, :year, :amount, :paymentDate, :paymentReference, :paymentMethod, :notes, 'PENDING_VERIFICATION', :dup)`,
    {
      id,
      memberId: params.memberId,
      month: params.month,
      year: params.year,
      amount: params.amount,
      paymentDate: params.paymentDate,
      paymentReference: params.paymentReference ?? null,
      paymentMethod: params.paymentMethod,
      notes: params.notes ?? null,
      dup: isDuplicate ? 1 : 0,
    }
  );

  for (const docId of params.evidenceDocumentIds) {
    run(
      `INSERT INTO contribution_evidence (id, contribution_id, document_id) VALUES (:id, :contribId, :docId)`,
      { id: newId("evid"), contribId: id, docId }
    );
  }

  logAudit({
    actorId: params.actorUserId,
    action: "CONTRIBUTION_SUBMITTED",
    entityType: "Contribution",
    entityId: id,
    newValue: params,
  });

  // notify all admins that a new contribution is awaiting verification
  const admins = all<{ id: string }>(`SELECT id FROM users WHERE role = 'ADMIN' AND is_active = 1`);
  for (const admin of admins) {
    notify({
      userId: admin.id,
      type: "CONTRIBUTION_RECEIVED",
      title: "New contribution to verify",
      body: `A contribution of UGX ${params.amount.toLocaleString()} for ${params.month}/${params.year} was submitted and needs verification.`,
    });
  }

  return { id, overLimit };
}

export function listContributions(filters: {
  month?: number;
  year?: number;
  memberId?: string;
  status?: string;
}): ContributionWithMember[] {
  const clauses: string[] = [];
  const p: Record<string, any> = {};
  if (filters.month) { clauses.push("c.month = :month"); p.month = filters.month; }
  if (filters.year) { clauses.push("c.year = :year"); p.year = filters.year; }
  if (filters.memberId) { clauses.push("c.member_id = :memberId"); p.memberId = filters.memberId; }
  if (filters.status) { clauses.push("c.status = :status"); p.status = filters.status; }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return all<ContributionWithMember>(
    `SELECT c.*, m.full_name, m.member_code, u2.email as verified_by_email,
            COALESCE(mu.full_name, '') as verified_by_name
     FROM contributions c
     JOIN members m ON m.id = c.member_id
     LEFT JOIN users u2 ON u2.id = c.verified_by_id
     LEFT JOIN members mu ON mu.user_id = c.verified_by_id
     ${where}
     ORDER BY c.created_at DESC`,
    p
  );
}

export function getContribution(id: string): ContributionWithMember | undefined {
  return one<ContributionWithMember>(
    `SELECT c.*, m.full_name, m.member_code, COALESCE(mu.full_name,'') as verified_by_name
     FROM contributions c
     JOIN members m ON m.id = c.member_id
     LEFT JOIN members mu ON mu.user_id = c.verified_by_id
     WHERE c.id = :id`,
    { id }
  );
}

export function getEvidenceForContribution(contributionId: string) {
  return all<{ id: string; filename: string; mime_type: string; size_bytes: number; document_id: string }>(
    `SELECT ce.id, d.id as document_id, d.filename, d.mime_type, d.size_bytes
     FROM contribution_evidence ce JOIN documents d ON d.id = ce.document_id
     WHERE ce.contribution_id = :contributionId`,
    { contributionId }
  );
}

export function approveContribution(params: { contributionId: string; adminUserId: string; overrideReason?: string }) {
  const c = one<ContributionRow>(`SELECT * FROM contributions WHERE id = :id`, { id: params.contributionId });
  if (!c) throw new Error("Contribution not found");
  if (c.status === "APPROVED") return;

  const { min, max } = getContributionLimits();
  const overLimit = c.amount < min || c.amount > max;
  if (overLimit && !params.overrideReason) {
    throw new Error("This amount is outside the normal UGX 100,000–500,000 range. Provide an override reason to approve it.");
  }

  run(
    `UPDATE contributions SET status = 'APPROVED', verified_by_id = :adminId, verified_at = datetime('now'),
       limit_overridden = :overridden, override_reason = :reason, updated_at = datetime('now')
     WHERE id = :id`,
    {
      id: c.id,
      adminId: params.adminUserId,
      overridden: overLimit ? 1 : 0,
      reason: params.overrideReason ?? null,
    }
  );

  const txnId = postTransaction({
    memberId: c.member_id,
    type: "CONTRIBUTION",
    amount: c.amount,
    month: c.month,
    year: c.year,
    description: `Contribution for ${c.month}/${c.year}`,
    contributionId: c.id,
  });

  logAudit({
    actorId: params.adminUserId,
    action: "CONTRIBUTION_APPROVED",
    entityType: "Contribution",
    entityId: c.id,
    previousValue: { status: c.status },
    newValue: { status: "APPROVED", transactionId: txnId, overrideReason: params.overrideReason ?? null },
  });

  const member = one<{ user_id: string; full_name: string }>(`SELECT user_id, full_name FROM members WHERE id = :id`, { id: c.member_id });
  if (member) {
    notify({
      userId: member.user_id,
      type: "CONTRIBUTION_APPROVED",
      title: "Contribution approved",
      body: `Your contribution of UGX ${c.amount.toLocaleString()} for ${c.month}/${c.year} has been verified and posted to your balance.`,
    });
  }
}

export function rejectContribution(params: { contributionId: string; adminUserId: string; reason: string }) {
  const c = one<ContributionRow>(`SELECT * FROM contributions WHERE id = :id`, { id: params.contributionId });
  if (!c) throw new Error("Contribution not found");
  if (c.status === "APPROVED") throw new Error("Cannot reject an already-approved contribution. Post a correction instead.");

  run(
    `UPDATE contributions SET status = 'REJECTED', verified_by_id = :adminId, verified_at = datetime('now'),
       rejection_reason = :reason, updated_at = datetime('now')
     WHERE id = :id`,
    { id: c.id, adminId: params.adminUserId, reason: params.reason }
  );

  logAudit({
    actorId: params.adminUserId,
    action: "CONTRIBUTION_REJECTED",
    entityType: "Contribution",
    entityId: c.id,
    previousValue: { status: c.status },
    newValue: { status: "REJECTED", reason: params.reason },
  });

  const member = one<{ user_id: string }>(`SELECT user_id FROM members WHERE id = :id`, { id: c.member_id });
  if (member) {
    notify({
      userId: member.user_id,
      type: "CONTRIBUTION_REJECTED",
      title: "Contribution needs attention",
      body: `Your contribution for ${c.month}/${c.year} was rejected: ${params.reason}. Please resubmit with corrected evidence.`,
    });
  }
}

/** Build the per-member x per-month collection matrix for a given period. */
export function getMonthlyCollectionView(month: number, year: number) {
  return all<{
    member_id: string;
    full_name: string;
    member_code: string;
    status: "ACTIVE" | "INACTIVE";
    expected: number;
    contribution_id: string | null;
    actual: number | null;
    payment_date: string | null;
    contrib_status: string | null;
    verified_by_name: string | null;
    possible_duplicate: number | null;
    rejection_reason: string | null;
  }>(
    `SELECT
       m.id as member_id, m.full_name, m.member_code, m.status,
       COALESCE(mc.expected_amount, m.monthly_commitment) as expected,
       c.id as contribution_id, c.amount as actual, c.payment_date, c.status as contrib_status,
       mu.full_name as verified_by_name, c.possible_duplicate, c.rejection_reason
     FROM members m
     LEFT JOIN monthly_commitments mc ON mc.member_id = m.id AND mc.month = :month AND mc.year = :year
     LEFT JOIN contributions c ON c.member_id = m.id AND c.month = :month AND c.year = :year AND c.status != 'REJECTED'
     LEFT JOIN members mu ON mu.user_id = c.verified_by_id
     WHERE m.status = 'ACTIVE'
     ORDER BY m.full_name ASC`,
    { month, year }
  );
}
