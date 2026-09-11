import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { getMemberTransactions } from "@/lib/ledger";
import { one } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await requireUser();
  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;
  const requestedMemberId = url.searchParams.get("memberId") ?? undefined;

  let memberId = user.memberId;
  if (user.role === "ADMIN" && requestedMemberId) memberId = requestedMemberId;
  if (!memberId) return NextResponse.json({ error: "No member context" }, { status: 400 });

  let openingBalance = 0;
  if (from) {
    const row = one<{ total: number | null }>(
      `SELECT SUM(amount) as total FROM transactions WHERE member_id = :memberId AND date(created_at) < date(:from)`,
      { memberId, from }
    );
    openingBalance = row?.total ?? 0;
  }

  const txns = getMemberTransactions(memberId, from && to ? { from, to } : undefined);
  let running = openingBalance;
  const rows = txns.map((t) => {
    running += t.amount;
    return { date: t.created_at, type: t.type, description: t.description, amount: t.amount, runningBalance: running };
  });
  return NextResponse.json({ rows, openingBalance });
}
