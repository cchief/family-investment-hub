import { all } from "@/lib/db";

export default async function AuditTrailPage({ searchParams }: { searchParams: { entityType?: string } }) {
  const filter = searchParams.entityType;
  const logs = all<{
    id: string; action: string; entity_type: string; entity_id: string;
    previous_value: string | null; new_value: string | null; reason: string | null;
    created_at: string; actor_email: string;
  }>(
    `SELECT a.*, u.email as actor_email FROM audit_logs a JOIN users u ON u.id = a.actor_id
     ${filter ? "WHERE a.entity_type = :filter" : ""}
     ORDER BY a.created_at DESC LIMIT 300`,
    filter ? { filter } : {}
  );

  const entityTypes = ["Contribution", "Member", "FundValuation", "FundTransfer", "Report"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Audit Trail</h1>
        <p className="text-ink/50 text-sm mt-1">Every financially meaningful change, append-only. Nothing here can be edited or deleted from the app.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <a href="/admin/audit-trail" className={`btn ${!filter ? "btn-primary" : "btn-secondary"} !py-1.5 !px-3 text-xs`}>All</a>
        {entityTypes.map((t) => (
          <a key={t} href={`/admin/audit-trail?entityType=${t}`} className={`btn ${filter === t ? "btn-primary" : "btn-secondary"} !py-1.5 !px-3 text-xs`}>{t}</a>
        ))}
      </div>

      <div className="card divide-y divide-black/5">
        {logs.length === 0 && <p className="text-center text-ink/40 py-10">No audit entries yet.</p>}
        {logs.map((l) => (
          <div key={l.id} className="px-5 py-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm font-semibold text-ink">{l.action.replace(/_/g, " ")}</p>
              <p className="text-[11px] text-ink/40">{new Date(l.created_at).toLocaleString("en-GB")}</p>
            </div>
            <p className="text-xs text-ink/45 mt-0.5">{l.entity_type} · {l.entity_id} · by {l.actor_email}{l.reason ? ` · reason: ${l.reason}` : ""}</p>
            {(l.previous_value || l.new_value) && (
              <details className="mt-1.5">
                <summary className="text-xs text-brand-600 cursor-pointer font-medium">View change</summary>
                <div className="grid sm:grid-cols-2 gap-2 mt-2 text-[11px]">
                  {l.previous_value && <pre className="bg-black/[0.03] rounded-lg p-2 overflow-x-auto">{JSON.stringify(JSON.parse(l.previous_value), null, 2)}</pre>}
                  {l.new_value && <pre className="bg-black/[0.03] rounded-lg p-2 overflow-x-auto">{JSON.stringify(JSON.parse(l.new_value), null, 2)}</pre>}
                </div>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
