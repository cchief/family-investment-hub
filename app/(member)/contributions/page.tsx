import { requireMember } from "@/lib/session";
import { listContributions } from "@/lib/repo/contributions";
import { ContributionsClient } from "./ContributionsClient";

export default async function ContributionsPage() {
  const user = await requireMember();
  const contributions = listContributions({ memberId: user.memberId! });
  return <ContributionsClient contributions={contributions} />;
}
