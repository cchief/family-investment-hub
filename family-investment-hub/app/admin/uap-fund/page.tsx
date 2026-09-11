import { listFundTransfers, listFundValuations, getTotalTransferred, getApprovedContributionsTotal } from "@/lib/repo/fund";
import { UapFundClient } from "./UapFundClient";

export default async function UapFundPage() {
  const transfers = listFundTransfers();
  const valuations = listFundValuations();
  const totalTransferred = getTotalTransferred();
  const now = new Date();
  const suggestedContributions = getApprovedContributionsTotal(now.getMonth() + 1, now.getFullYear());
  return <UapFundClient transfers={transfers} valuations={valuations} totalTransferred={totalTransferred} suggestedContributions={suggestedContributions} />;
}
