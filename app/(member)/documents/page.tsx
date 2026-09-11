import { requireMember } from "@/lib/session";
import { all } from "@/lib/db";
import { monthLabel } from "@/lib/currency";

export default async function DocumentsPage() {
  const user = await requireMember();
  const docs = all<{ id: string; filename: string; mime_type: string; created_at: string; month: number; year: number; status: string }>(
    `SELECT d.id, d.filename, d.mime_type, d.created_at, c.month, c.year, c.status
     FROM documents d
     JOIN contribution_evidence ce ON ce.document_id = d.id
     JOIN contributions c ON c.id = ce.contribution_id
     WHERE c.member_id = :memberId
     ORDER BY d.created_at DESC`,
    { memberId: user.memberId }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Documents</h1>
        <p className="text-ink/50 text-sm mt-1">Proof of payment you've uploaded.</p>
      </div>
      <div className="card divide-y divide-black/5">
        {docs.length === 0 && <p className="text-center text-ink/40 py-10">No documents uploaded yet.</p>}
        {docs.map((d) => (
          <a key={d.id} href={`/api/documents/${d.id}`} target="_blank" rel="noreferrer" className="flex items-center justify-between px-5 py-3.5 hover:bg-black/[0.02]">
            <div className="flex items-center gap-3">
              <span className="text-xl">{d.mime_type === "application/pdf" ? "📄" : "🖼️"}</span>
              <div>
                <p className="text-sm font-medium text-ink">{d.filename}</p>
                <p className="text-xs text-ink/45">{monthLabel(d.month, d.year)} contribution · {d.status.replace("_", " ")}</p>
              </div>
            </div>
            <span className="text-xs text-brand-600 font-semibold">View →</span>
          </a>
        ))}
      </div>
    </div>
  );
}
