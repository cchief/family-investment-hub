import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatUGX, monthLabel } from "@/lib/currency";
import type { MonthlyReportData } from "@/lib/reportData";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#0F1A2B" },
  bar: { width: 34, height: 6, backgroundColor: "#C79A3B", marginBottom: 8, borderRadius: 2 },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  subtitle: { fontSize: 10, color: "#6B6656", marginBottom: 16 },
  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  kpiBox: { flex: 1, borderWidth: 1, borderColor: "#C79A3B", borderRadius: 6, padding: 8 },
  kpiLabel: { fontSize: 7, color: "#6B6656", textTransform: "uppercase", marginBottom: 3, letterSpacing: 0.5 },
  kpiValue: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  sectionHeader: { fontSize: 9, fontFamily: "Helvetica-Bold", textTransform: "uppercase", borderWidth: 1, borderColor: "#C79A3B", borderRadius: 4, padding: 5, textAlign: "center", marginTop: 14, marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: "#EEEAE0" },
  label: { color: "#6B6656" },
  bold: { fontFamily: "Helvetica-Bold" },
  twoCol: { flexDirection: "row", gap: 16 },
  col: { flex: 1 },
  tableHeader: { flexDirection: "row", backgroundColor: "#8C8C8C", paddingVertical: 4, paddingHorizontal: 4 },
  th: { color: "#fff", fontSize: 7, fontFamily: "Helvetica-Bold", flex: 1 },
  tr: { flexDirection: "row", paddingVertical: 3, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: "#EEEAE0" },
  td: { fontSize: 8, flex: 1 },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 7, color: "#9A9484", textAlign: "center" },
});

export function MonthlyReportDoc({ data, commentary }: { data: MonthlyReportData; commentary: string }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.bar} />
        <Text style={s.title}>Family Investment Hub — Monthly Family Report</Text>
        <Text style={s.subtitle}>{monthLabel(data.month, data.year)} · Save consistently. Grow together.</Text>

        <View style={s.kpiRow}>
          <View style={s.kpiBox}><Text style={s.kpiLabel}>Closing Fund Balance</Text><Text style={s.kpiValue}>{formatUGX(data.closingBalance)}</Text></View>
          <View style={s.kpiBox}><Text style={s.kpiLabel}>Contribution Compliance</Text><Text style={s.kpiValue}>{data.compliance.toFixed(0)}%</Text></View>
          <View style={s.kpiBox}><Text style={s.kpiLabel}>Interest Earned</Text><Text style={s.kpiValue}>{formatUGX(data.interestEarned)}</Text></View>
          <View style={s.kpiBox}><Text style={s.kpiLabel}>MoM Growth</Text><Text style={s.kpiValue}>{data.momGrowth != null ? `${data.momGrowth.toFixed(1)}%` : "—"}</Text></View>
        </View>

        <View style={s.twoCol}>
          <View style={s.col}>
            <Text style={s.sectionHeader}>Fund Summary</Text>
            <View style={s.row}><Text style={s.label}>Opening fund balance</Text><Text>{formatUGX(data.openingBalance)}</Text></View>
            <View style={s.row}><Text style={s.label}>Total contributions this month</Text><Text>{formatUGX(data.totalContributions)}</Text></View>
            <View style={s.row}><Text style={s.label}>Amount transferred to UAP</Text><Text>{formatUGX(data.amountTransferred)}</Text></View>
            <View style={s.row}><Text style={s.label}>Interest earned</Text><Text>{formatUGX(data.interestEarned)}</Text></View>
            <View style={s.row}><Text style={s.label}>Closing fund balance</Text><Text style={s.bold}>{formatUGX(data.closingBalance)}</Text></View>
            <View style={s.row}><Text style={s.label}>Total principal to date</Text><Text>{formatUGX(data.principal)}</Text></View>
            <View style={s.row}><Text style={s.label}>Total interest to date</Text><Text>{formatUGX(data.interest)}</Text></View>
          </View>
          <View style={s.col}>
            <Text style={s.sectionHeader}>Membership</Text>
            <View style={s.row}><Text style={s.label}>Total members</Text><Text>{data.totalMembers}</Text></View>
            <View style={s.row}><Text style={s.label}>Members who contributed</Text><Text>{data.membersContributed}</Text></View>
            <View style={s.row}><Text style={s.label}>Contribution compliance</Text><Text style={s.bold}>{data.compliance.toFixed(1)}%</Text></View>
            <View style={s.row}><Text style={s.label}>Outstanding members</Text><Text>{data.outstanding.length}</Text></View>
            {data.outstanding.slice(0, 8).map((o) => (
              <View style={s.row} key={o.full_name}><Text style={s.label}>  — {o.full_name}</Text><Text>{formatUGX(o.expected)}</Text></View>
            ))}
          </View>
        </View>

        <Text style={s.sectionHeader}>Summary Commentary</Text>
        <Text style={{ fontSize: 9, lineHeight: 1.5 }}>{commentary || "No commentary provided."}</Text>

        <Text style={s.sectionHeader}>Member Contribution Summary</Text>
        <View style={s.tableHeader}>
          <Text style={s.th}>Member</Text><Text style={s.th}>Amount</Text><Text style={s.th}>Status</Text>
        </View>
        {data.memberSummary.map((m) => (
          <View style={s.tr} key={m.member_code}>
            <Text style={s.td}>{m.full_name}</Text>
            <Text style={s.td}>{m.amount != null ? formatUGX(m.amount) : "—"}</Text>
            <Text style={s.td}>{m.status === "APPROVED" ? "Paid & Verified" : m.status === "PENDING_VERIFICATION" ? "Pending Verification" : "Not Paid"}</Text>
          </View>
        ))}

        <Text style={s.footer}>Generated by Family Investment Hub · Confidential — for family members only</Text>
      </Page>
    </Document>
  );
}
