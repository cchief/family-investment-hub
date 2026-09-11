import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { requireUser } from "@/lib/session";
import { getDocument, resolveDocumentPath } from "@/lib/repo/documents";
import { one } from "@/lib/db";

// Every file lives outside /public. Nothing is ever streamed here without
// checking: (a) the viewer is signed in, and (b) if they are a MEMBER, that
// the document belongs to their own evidence (admins can see any document).
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const doc = getDocument(params.id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.role !== "ADMIN") {
    const owns = one<{ n: number }>(
      `SELECT COUNT(*) as n FROM contribution_evidence ce
       JOIN contributions c ON c.id = ce.contribution_id
       WHERE ce.document_id = :docId AND c.member_id = :memberId`,
      { docId: doc.id, memberId: user.memberId }
    );
    if (!owns || owns.n === 0) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const filePath = resolveDocumentPath(doc);
  if (!fs.existsSync(filePath)) return NextResponse.json({ error: "File missing on disk" }, { status: 404 });
  const buf = fs.readFileSync(filePath);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": doc.mime_type,
      "Content-Disposition": `inline; filename="${doc.filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}
