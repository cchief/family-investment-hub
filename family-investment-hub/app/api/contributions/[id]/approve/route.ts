import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { approveContribution } from "@/lib/repo/contributions";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  const body = await req.json().catch(() => ({}));
  try {
    approveContribution({ contributionId: params.id, adminUserId: admin.id, overrideReason: body.overrideReason });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Could not approve" }, { status: 400 });
  }
}
