import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireAdmin } from "@/lib/session";
import { buildMonthlyReportData } from "@/lib/reportData";
import { MonthlyReportDoc } from "@/lib/pdf/MonthlyReportDoc";
import { monthLabel } from "@/lib/currency";
import { logAudit } from "@/lib/audit";
import React from "react";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  const body = await req.json();
  const month = Number(body.month);
  const year = Number(body.year);
  const commentary = String(body.commentary ?? "");

  const data = buildMonthlyReportData(month, year);
  const buffer = await renderToBuffer(React.createElement(MonthlyReportDoc, { data, commentary }) as any);

  logAudit({ actorId: admin.id, action: "MONTHLY_REPORT_GENERATED", entityType: "Report", entityId: `${month}-${year}`, newValue: { month, year, commentaryLength: commentary.length } });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="FIH-Monthly-Report-${monthLabel(month, year).replace(" ", "-")}.pdf"`,
    },
  });
}
