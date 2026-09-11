import { listMembers } from "@/lib/repo/members";
import { getMemberBalance } from "@/lib/ledger";
import { MembersClient } from "./MembersClient";

export default async function MembersPage() {
  const members = listMembers();
  const withBalance = members.map((m) => ({ ...m, balance: getMemberBalance(m.id) }));
  return <MembersClient members={withBalance} />;
}
