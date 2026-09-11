import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { rejectContribution } from "@/lib/repo/contributions";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  const body = await req.json().catch(() => ({}));
  if (!body.reason || !String(body.reason).trim()) {
    return NextResponse.json({ error: "A rejection reason is required." }, { status: 400 });
  }
  try {
    rejectContribution({ contributionId: params.id, adminUserId: admin.id, reason: body.reason });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Could not reject" }, { status: 400 });
  }
}
