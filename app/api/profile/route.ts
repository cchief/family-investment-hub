import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { run } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const user = await requireMember();
  const body = await req.json();
  run(`UPDATE members SET phone = :phone, updated_at = datetime('now') WHERE id = :id`, { id: user.memberId, phone: body.phone ?? null });
  logAudit({ actorId: user.id, action: "PROFILE_UPDATED", entityType: "Member", entityId: user.memberId!, newValue: { phone: body.phone } });
  return NextResponse.json({ ok: true });
}
