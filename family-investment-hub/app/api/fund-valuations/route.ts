import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { recordFundValuation } from "@/lib/repo/fund";
import { z } from "zod";

const schema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
  openingBalance: z.coerce.number().int(),
  newContributions: z.coerce.number().int(),
  interestEarned: z.coerce.number().int(),
  withdrawals: z.coerce.number().int().default(0),
  charges: z.coerce.number().int().default(0),
  commentary: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  try {
    const result = recordFundValuation({ actorId: admin.id, ...parsed.data });
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Could not record valuation" }, { status: 400 });
  }
}
