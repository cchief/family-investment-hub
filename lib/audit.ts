import { run } from "./db";
import { newId } from "./ids";

/**
 * Every financially meaningful change is logged here. Application code
 * must never call this table's rows an "update log that can be edited" —
 * nothing writes to audit_logs except this function, and nothing ever
 * UPDATEs or DELETEs a row in it.
 */
export function logAudit(params: {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: unknown;
  newValue?: unknown;
  reason?: string;
}) {
  run(
    `INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, previous_value, new_value, reason)
     VALUES (:id, :actorId, :action, :entityType, :entityId, :previousValue, :newValue, :reason)`,
    {
      id: newId("audit"),
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      previousValue: params.previousValue != null ? JSON.stringify(params.previousValue) : null,
      newValue: params.newValue != null ? JSON.stringify(params.newValue) : null,
      reason: params.reason ?? null,
    }
  );
}
