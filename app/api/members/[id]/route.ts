import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { updateMember } from "@/lib/repo/members";
import { z } from "zod";

const schema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
  monthlyCommitment: z.coerce.number().int().min(0).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  try {
    updateMember({ actorId: admin.id, memberId: params.id, ...parsed.data });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Could not update member" }, { status: 400 });
  }
}
