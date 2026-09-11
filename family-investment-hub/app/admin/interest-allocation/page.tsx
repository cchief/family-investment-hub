import { listFundValuations, hasAllocationForMonth } from "@/lib/repo/fund";
import { listMembers } from "@/lib/repo/members";
import { InterestAllocationClient } from "./InterestAllocationClient";

export default async function InterestAllocationPage() {
  const valuations = listFundValuations().map((v) => ({ ...v, alreadyAllocated: hasAllocationForMonth(v.id) }));
  const members = listMembers().filter((m) => m.status === "ACTIVE");
  return <InterestAllocationClient valuations={valuations} members={members} />;
}
