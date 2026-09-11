import { all } from "@/lib/db";
import { monthLabel } from "@/lib/currency";

export default async function AdminDocumentsPage() {
  const docs = all<{
    id: string; filename: string; mime_type: string; created_at: string;
    full_name: string | null; month: number | null; year: number | null; kind: string;
  }>(
    `SELECT * FROM (
       SELECT d.id, d.filename, d.mime_type, d.created_at, m.full_name, c.month, c.year, 'Contribution Evidence' as kind
       FROM documents d
       JOIN contribution_evidence ce ON ce.document_id = d.id
       JOIN contributions c ON c.id = ce.contribution_id
       JOIN members m ON m.id = c.member_id
       UNION ALL
       SELECT d.id, d.filename, d.mime_type, d.created_at, NULL, NULL, NULL, 'UAP Transfer Support'
       FROM documents d JOIN fund_transfers ft ON ft.document_id = d.id
     ) ORDER BY created_at DESC`
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Documents</h1>
        <p className="text-ink/50 text-sm mt-1">All evidence and supporting documents uploaded across the fund.</p>
      </div>
      <div className="card divide-y divide-black/5">
        {docs.length === 0 && <p className="text-center text-ink/40 py-10">No documents yet.</p>}
        {docs.map((d) => (
          <a key={d.id} href={`/api/documents/${d.id}`} target="_blank" rel="noreferrer" className="flex items-center justify-between px-5 py-3.5 hover:bg-black/[0.02]">
            <div className="flex items-center gap-3">
              <span className="text-xl">{d.mime_type === "application/pdf" ? "📄" : "🖼️"}</span>
              <div>
                <p className="text-sm font-medium text-ink">{d.filename}</p>
                <p className="text-xs text-ink/45">
                  {d.kind}{d.full_name ? ` · ${d.full_name}` : ""}{d.month ? ` · ${monthLabel(d.month, d.year!)}` : ""} · {new Date(d.created_at).toLocaleDateString("en-GB")}
                </p>
              </div>
            </div>
            <span className="text-xs text-brand-600 font-semibold">View →</span>
          </a>
        ))}
      </div>
    </div>
  );
}
