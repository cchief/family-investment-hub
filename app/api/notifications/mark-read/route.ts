import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { markAllRead } from "@/lib/repo/notifications";

export async function POST() {
  const user = await requireUser();
  markAllRead(user.id);
  return NextResponse.json({ ok: true });
}
