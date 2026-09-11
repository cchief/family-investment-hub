import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { applyInterestAllocation } from "@/lib/repo/fund";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  const body = await req.json();
  try {
    applyInterestAllocation({
      actorId: admin.id,
      fundValuationId: body.fundValuationId,
      method: body.method,
      allocations: body.allocations,
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Could not allocate interest" }, { status: 400 });
  }
}
