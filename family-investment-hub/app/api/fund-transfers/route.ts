import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { recordFundTransfer } from "@/lib/repo/fund";
import { saveUploadedFile } from "@/lib/repo/documents";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  const form = await req.formData();
  const transferDate = String(form.get("transferDate") ?? "");
  const amount = Number(form.get("amount"));
  const reference = String(form.get("reference") ?? "");
  const notes = String(form.get("notes") ?? "");
  const file = form.get("document");

  if (!transferDate || !amount || amount <= 0) {
    return NextResponse.json({ error: "Transfer date and a positive amount are required." }, { status: 400 });
  }

  try {
    let documentId: string | undefined;
    if (file instanceof File && file.size > 0) {
      const doc = await saveUploadedFile({ file, uploadedById: admin.id });
      documentId = doc.id;
    }
    const id = recordFundTransfer({ actorId: admin.id, transferDate, amount, reference, documentId, notes });
    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Could not record transfer" }, { status: 400 });
  }
}
