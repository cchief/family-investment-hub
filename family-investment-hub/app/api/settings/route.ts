import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { setSetting } from "@/lib/repo/settings";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  const body = await req.json();
  for (const [key, value] of Object.entries(body)) {
    setSetting(key, String(value));
  }
  logAudit({ actorId: admin.id, action: "SETTINGS_UPDATED", entityType: "SystemSetting", entityId: "global", newValue: body });
  return NextResponse.json({ ok: true });
}
