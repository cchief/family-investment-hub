import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { lockFundValuation } from "@/lib/repo/fund";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  lockFundValuation(params.id, admin.id);
  return NextResponse.json({ ok: true });
}
