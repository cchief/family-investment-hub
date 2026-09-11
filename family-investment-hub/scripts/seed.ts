/**
 * Seed script — 1 admin + 8 fictional members, 6 months of contribution
 * history with a realistic mix of statuses (paid, late, pending, rejected +
 * resubmitted, outstanding), fund valuations, UAP transfers and interest
 * allocations (both allocation methods demonstrated).
 *
 * Run with: npm run db:seed   (or npm run db:reset to wipe and reseed)
 */
import fs from "node:fs";
import path from "node:path";
import { db, run, one } from "../lib/db";
import { newId } from "../lib/ids";
import { hashPassword } from "../lib/auth";
import { createMember, setMemberPassword } from "../lib/repo/members";
import { submitContribution, approveContribution, rejectContribution } from "../lib/repo/contributions";
import { recordFundValuation, recordFundTransfer, previewProportionalAllocation, applyInterestAllocation } from "../lib/repo/fund";
import { setSetting } from "../lib/repo/settings";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// 1x1 transparent PNG — stand-in for a scanned deposit slip / screenshot.
const PLACEHOLDER_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

function makeEvidenceDoc(uploadedById: string, label: string): string {
  const id = newId("doc");
  const storedName = `${id}.png`;
  fs.writeFileSync(path.join(UPLOAD_DIR, storedName), PLACEHOLDER_PNG);
  run(
    `INSERT INTO documents (id, filename, stored_path, mime_type, size_bytes, uploaded_by_id) VALUES (:id, :filename, :storedPath, :mimeType, :sizeBytes, :uploadedById)`,
    { id, filename: `${label}.png`, storedPath: storedName, mimeType: "image/png", sizeBytes: PLACEHOLDER_PNG.length, uploadedById }
  );
  return id;
}

async function main() {
  console.log("Seeding Family Investment Hub…");

  setSetting("MIN_CONTRIBUTION", "100000");
  setSetting("MAX_CONTRIBUTION", "500000");
  setSetting("MEMBER_DEADLINE_DAY", "10");
  setSetting("UAP_TRANSFER_DEADLINE_DAY", "15");
  setSetting("FUND_NAME", "UAP Umbrella Trust Fund");

  // ---------------- Admin ----------------
  const adminId = newId("user");
  run(`INSERT INTO users (id, email, password_hash, role) VALUES (:id, :email, :hash, 'ADMIN')`, {
    id: adminId, email: "admin@family.com", hash: await hashPassword("Admin123!"),
  });
  console.log("  ✓ Admin: admin@family.com / Admin123!");

  // ---------------- Members ----------------
  type Seed = { name: string; email: string; phone: string; joinDate: string; commitment: number; opening?: number };
  const memberSeeds: Seed[] = [
    { name: "Grace Nakato", email: "grace@family.com", phone: "+256700111222", joinDate: "2026-04-01", commitment: 250000 },
    { name: "Peter Okello", email: "peter@family.com", phone: "+256700111223", joinDate: "2026-04-01", commitment: 300000 },
    { name: "Sarah Namuli", email: "sarah@family.com", phone: "+256700111224", joinDate: "2026-04-01", commitment: 200000 },
    { name: "David Mugisha", email: "david@family.com", phone: "+256700111225", joinDate: "2026-04-01", commitment: 200000 },
    { name: "Ruth Achieng", email: "ruth@family.com", phone: "+256700111226", joinDate: "2026-04-01", commitment: 150000 },
    { name: "Samuel Bwire", email: "samuel@family.com", phone: "+256700111227", joinDate: "2026-04-01", commitment: 220000 },
    { name: "Esther Nabirye", email: "esther@family.com", phone: "+256700111228", joinDate: "2026-04-01", commitment: 180000 },
    { name: "Joseph Kato", email: "joseph@family.com", phone: "+256700111229", joinDate: "2026-04-01", commitment: 200000, opening: 150000 },
  ];

  const members: { id: string; userId: string; name: string; commitment: number }[] = [];
  for (const s of memberSeeds) {
    const { memberId, userId } = createMember({
      actorId: adminId, fullName: s.name, email: s.email, phone: s.phone, joinDate: s.joinDate,
      monthlyCommitment: s.commitment, openingBalance: s.opening ?? 0, temporaryPassword: "Member123!",
    });
    await setMemberPassword(userId, "Member123!");
    members.push({ id: memberId, userId, name: s.name, commitment: s.commitment });
  }
  console.log(`  ✓ ${members.length} members created (password: Member123!)`);

  const [grace, peter, sarah, david, ruth, samuel, esther, joseph] = members;

  // ---------------- 6 months of history: Apr–Sep 2026 ----------------
  const months = [
    { month: 4, year: 2026 },
    { month: 5, year: 2026 },
    { month: 6, year: 2026 },
    { month: 7, year: 2026 },
    { month: 8, year: 2026 }, // last fully-closed month
    { month: 9, year: 2026 }, // current, in-progress month
  ];

  function pay(memberId: string, actorUserId: string, month: number, year: number, amount: number, day: number, ref: string) {
    const docId = makeEvidenceDoc(actorUserId, `deposit-slip-${month}-${year}`);
    const { id } = submitContribution({
      memberId, actorUserId, month, year, amount,
      paymentDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      paymentReference: ref, paymentMethod: day <= 10 ? "Bank Deposit" : "Mobile Money",
      evidenceDocumentIds: [docId],
    });
    return id;
  }

  // Interest earned per closed month (illustrative UAP performance)
  const interestByMonth: Record<string, number> = {
    "4-2026": 0, "5-2026": 42000, "6-2026": 58000, "7-2026": 61000, "8-2026": 74000,
  };

  let cumulativeOpening = 0;
  let cumulativeTransferred = 0;

  for (const { month, year } of months) {
    const isCurrent = month === 9 && year === 2026;
    const key = `${month}-${year}`;

    // Grace: always pays early, on commitment
    let cid = pay(grace.id, grace.userId, month, year, grace.commitment, 3, `GN-${key}`);
    approveContribution({ contributionId: cid, adminUserId: adminId });

    // Peter: always pays on time
    cid = pay(peter.id, peter.userId, month, year, peter.commitment, 5, `PO-${key}`);
    approveContribution({ contributionId: cid, adminUserId: adminId });

    // Sarah (demo member login): consistent, slightly varying amount
    cid = pay(sarah.id, sarah.userId, month, year, sarah.commitment, 4, `SN-${key}`);
    approveContribution({ contributionId: cid, adminUserId: adminId });

    // David: late in July (paid on the 18th) — still approved, shows "late" pattern
    if (month === 7) {
      cid = pay(david.id, david.userId, month, year, david.commitment, 18, `DM-${key}`);
      approveContribution({ contributionId: cid, adminUserId: adminId });
    } else if (!isCurrent) {
      cid = pay(david.id, david.userId, month, year, david.commitment, 8, `DM-${key}`);
      approveContribution({ contributionId: cid, adminUserId: adminId });
    } else {
      // current month: David makes an over-the-cap catch-up payment needing override
      cid = pay(david.id, david.userId, month, year, 550000, 6, `DM-${key}-CATCHUP`);
      approveContribution({ contributionId: cid, adminUserId: adminId, overrideReason: "Catch-up payment covering a previously missed month, agreed with family treasurer." });
    }

    // Ruth: rejected once in June (blurry slip), resubmitted and approved
    if (month === 6) {
      const badId = pay(ruth.id, ruth.userId, month, year, ruth.commitment, 9, `RA-${key}-1`);
      rejectContribution({ contributionId: badId, adminUserId: adminId, reason: "Deposit slip image is illegible — please re-upload a clearer photo." });
      const goodId = pay(ruth.id, ruth.userId, month, year, ruth.commitment, 12, `RA-${key}-2`);
      approveContribution({ contributionId: goodId, adminUserId: adminId });
    } else if (!isCurrent) {
      cid = pay(ruth.id, ruth.userId, month, year, ruth.commitment, 7, `RA-${key}`);
      approveContribution({ contributionId: cid, adminUserId: adminId });
    }

    // Samuel: consistent historically; CURRENT month left pending verification (demo queue)
    if (!isCurrent) {
      cid = pay(samuel.id, samuel.userId, month, year, samuel.commitment, 6, `SB-${key}`);
      approveContribution({ contributionId: cid, adminUserId: adminId });
    } else {
      pay(samuel.id, samuel.userId, month, year, samuel.commitment, 9, `SB-${key}`); // left PENDING_VERIFICATION
    }

    // Esther: consistent historically; CURRENT month outstanding (not paid at all — demo alert)
    if (!isCurrent) {
      cid = pay(esther.id, esther.userId, month, year, esther.commitment, 10, `EN-${key}`);
      approveContribution({ contributionId: cid, adminUserId: adminId });
    }

    // Joseph: contributed Apr–Jul, went inactive from August (opening balance carried forward)
    if (month <= 7) {
      cid = pay(joseph.id, joseph.userId, month, year, joseph.commitment, 5, `JK-${key}`);
      approveContribution({ contributionId: cid, adminUserId: adminId });
    }

    if (!isCurrent) {
      // ---- Month-end close: fund valuation, UAP transfer, interest allocation ----
      const contributionsThisMonth = one<{ total: number | null }>(
        `SELECT SUM(amount) as total FROM contributions WHERE month=:month AND year=:year AND status='APPROVED'`,
        { month, year }
      )!.total ?? 0;
      const interest = interestByMonth[key] ?? 0;

      const { closingBalance, id: fvId } = recordFundValuation({
        actorId: adminId, month, year,
        openingBalance: cumulativeOpening,
        newContributions: contributionsThisMonth,
        interestEarned: interest,
        commentary: month === 8
          ? "Strong month: all core members on time except the two flagged in Collections. UAP performance continues to track ahead of the 8% p.a. target."
          : month === 4
          ? "Fund launched this month with 8 founding members and Joseph Kato's opening balance carried over from the prior informal arrangement."
          : undefined,
      });

      if (interest > 0) {
        if (month === 5) {
          // demonstrate MANUAL allocation for one month
          const activeAtTheTime = [grace, peter, sarah, david, ruth, samuel, esther, joseph];
          const share = Math.floor(interest / activeAtTheTime.length);
          let remainder = interest - share * activeAtTheTime.length;
          const allocations = activeAtTheTime.map((m, i) => ({ memberId: m.id, amount: share + (i === 0 ? remainder : 0) }));
          applyInterestAllocation({ actorId: adminId, fundValuationId: fvId, method: "MANUAL", allocations });
        } else {
          const preview = previewProportionalAllocation(fvId);
          applyInterestAllocation({
            actorId: adminId, fundValuationId: fvId, method: "PROPORTIONAL",
            allocations: preview.map((p) => ({ memberId: p.memberId, amount: p.amount })),
          });
        }
      }

      // Transfer approved contributions to UAP a few days after month-end (through month 7 only,
      // leaving August's collections "awaiting transfer" so the dashboard alert has something to show)
      if (month <= 7) {
        const toTransfer = contributionsThisMonth;
        if (toTransfer > 0) {
          recordFundTransfer({
            actorId: adminId,
            transferDate: `${year}-${String(month).padStart(2, "0")}-14`,
            amount: toTransfer,
            reference: `UAP-XFER-${key}`,
            notes: `Monthly pooled contributions for ${key}`,
          });
          cumulativeTransferred += toTransfer;
        }
      }

      cumulativeOpening = closingBalance;
    }
  }

  // Mark Joseph inactive as of August (history stays intact)
  run(`UPDATE members SET status = 'INACTIVE', updated_at = datetime('now') WHERE id = :id`, { id: joseph.id });
  run(
    `INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, new_value, reason) VALUES (:id, :actorId, 'MEMBER_UPDATED', 'Member', :entityId, :newValue, :reason)`,
    { id: newId("audit"), actorId: adminId, entityId: joseph.id, newValue: JSON.stringify({ status: "INACTIVE" }), reason: "Relocated abroad; paused contributions from August 2026." }
  );

  console.log("  ✓ 6 months of contribution history seeded (Apr–Sep 2026)");
  console.log("  ✓ 5 fund valuations, UAP transfers and interest allocations recorded");
  console.log("\nDone. Start the app with: npm run dev");
  console.log("Admin login:  admin@family.com / Admin123!");
  console.log("Member login: sarah@family.com / Member123!  (or grace/peter/david/ruth/samuel/esther/joseph@family.com)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
