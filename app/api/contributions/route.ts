import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { saveUploadedFile } from "@/lib/repo/documents";
import { submitContribution } from "@/lib/repo/contributions";
import { z } from "zod";

const schema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
  amount: z.coerce.number().int().positive(),
  paymentDate: z.string().min(1),
  paymentReference: z.string().optional(),
  paymentMethod: z.string().min(1),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await requireMember();
  const form = await req.formData();

  const parsed = schema.safeParse({
    month: form.get("month"),
    year: form.get("year"),
    amount: form.get("amount"),
    paymentDate: form.get("paymentDate"),
    paymentReference: form.get("paymentReference") || undefined,
    paymentMethod: form.get("paymentMethod"),
    notes: form.get("notes") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid submission" }, { status: 400 });
  }

  const files = form.getAll("evidence").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return NextResponse.json({ error: "Please attach at least one proof of payment (JPG, PNG or PDF)." }, { status: 400 });
  }

  try {
    const docIds: string[] = [];
    for (const file of files) {
      const doc = await saveUploadedFile({ file, uploadedById: user.id });
      docIds.push(doc.id);
    }

    const result = submitContribution({
      memberId: user.memberId!,
      actorUserId: user.id,
      month: parsed.data.month,
      year: parsed.data.year,
      amount: parsed.data.amount,
      paymentDate: parsed.data.paymentDate,
      paymentReference: parsed.data.paymentReference,
      paymentMethod: parsed.data.paymentMethod,
      notes: parsed.data.notes,
      evidenceDocumentIds: docIds,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Could not submit contribution" }, { status: 400 });
  }
}
