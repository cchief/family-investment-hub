import { getMonthlyCollectionView } from "@/lib/repo/contributions";
import { CollectionsClient } from "./CollectionsClient";

export default async function CollectionsPage({ searchParams }: { searchParams: { month?: string; year?: string } }) {
  const now = new Date();
  const month = Number(searchParams.month) || now.getMonth() + 1;
  const year = Number(searchParams.year) || now.getFullYear();
  const rows = getMonthlyCollectionView(month, year);
  return <CollectionsClient rows={rows} month={month} year={year} />;
}
