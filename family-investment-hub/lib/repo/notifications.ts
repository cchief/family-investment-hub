import { all, run } from "../db";
import { newId } from "../ids";

/**
 * In-app notifications for the MVP. `channel` is already modeled so that
 * EMAIL / WHATSAPP / SMS can be added later without a schema change — a
 * background worker would just read channel != IN_APP rows and dispatch
 * them through a provider, then mark them sent.
 */
export function notify(params: {
  userId: string;
  type: string;
  title: string;
  body: string;
  channel?: "IN_APP" | "EMAIL" | "WHATSAPP" | "SMS";
}) {
  run(
    `INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES (:id, :userId, :type, :channel, :title, :body)`,
    { id: newId("notif"), userId: params.userId, type: params.type, channel: params.channel ?? "IN_APP", title: params.title, body: params.body }
  );
}

export function listNotifications(userId: string, limit = 30) {
  return all<{ id: string; type: string; title: string; body: string; read_at: string | null; created_at: string }>(
    `SELECT id, type, title, body, read_at, created_at FROM notifications WHERE user_id = :userId ORDER BY created_at DESC LIMIT :limit`,
    { userId, limit }
  );
}

export function unreadCount(userId: string): number {
  const rows = all<{ n: number }>(`SELECT COUNT(*) as n FROM notifications WHERE user_id = :userId AND read_at IS NULL`, { userId });
  return rows[0]?.n ?? 0;
}

export function markAllRead(userId: string) {
  run(`UPDATE notifications SET read_at = datetime('now') WHERE user_id = :userId AND read_at IS NULL`, { userId });
}
