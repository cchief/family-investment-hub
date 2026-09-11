import { requireUser } from "@/lib/session";
import { listNotifications } from "@/lib/repo/notifications";
import { MarkReadButton } from "./MarkReadButton";

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = listNotifications(user.id, 50);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Notifications</h1>
          <p className="text-ink/50 text-sm mt-1">In-app alerts. Email/WhatsApp/SMS delivery can be added later on this same feed.</p>
        </div>
        <MarkReadButton />
      </div>
      <div className="card divide-y divide-black/5">
        {items.length === 0 && <p className="text-center text-ink/40 py-10">You're all caught up.</p>}
        {items.map((n) => (
          <div key={n.id} className={`px-5 py-4 ${!n.read_at ? "bg-brand-50/50" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-ink">{n.title}</p>
              <p className="text-[11px] text-ink/40 whitespace-nowrap">{new Date(n.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</p>
            </div>
            <p className="text-sm text-ink/60 mt-1">{n.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
