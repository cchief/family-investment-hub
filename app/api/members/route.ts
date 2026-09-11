import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { createMember, setMemberPassword } from "@/lib/repo/members";
import { z } from "zod";

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  joinDate: z.string().min(1),
  monthlyCommitment: z.coerce.number().int().min(0),
  openingBalance: z.coerce.number().int().default(0),
  temporaryPassword: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  try {
    const { userId, memberId } = createMember({ actorId: admin.id, ...parsed.data });
    await setMemberPassword(userId, parsed.data.temporaryPassword);
    return NextResponse.json({ ok: true, memberId });
  } catch (err: any) {
    const msg = String(err.message || "");
    if (msg.includes("UNIQUE") && msg.includes("email")) {
      return NextResponse.json({ error: "A user with this email already exists." }, { status: 400 });
    }
    return NextResponse.json({ error: msg || "Could not create member" }, { status: 400 });
  }
}
