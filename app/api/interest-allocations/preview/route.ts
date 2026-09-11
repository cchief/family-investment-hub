import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { previewProportionalAllocation } from "@/lib/repo/fund";

export async function GET(req: NextRequest) {
  await requireAdmin();
  const fundValuationId = new URL(req.url).searchParams.get("fundValuationId");
  if (!fundValuationId) return NextResponse.json({ error: "Missing fundValuationId" }, { status: 400 });
  try {
    const preview = previewProportionalAllocation(fundValuationId);
    return NextResponse.json({ preview });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
