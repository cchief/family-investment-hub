import { listContributions } from "@/lib/repo/contributions";
import { getEvidenceForContribution } from "@/lib/repo/contributions";
import { VerificationClient } from "./VerificationClient";

export default async function VerificationPage() {
  const pending = listContributions({ status: "PENDING_VERIFICATION" });
  const withEvidence = pending.map((c) => ({ ...c, evidence: getEvidenceForContribution(c.id) }));
  return <VerificationClient items={withEvidence} />;
}
