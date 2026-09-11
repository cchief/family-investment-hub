import { one, run } from "../db";

const DEFAULTS: Record<string, string> = {
  MIN_CONTRIBUTION: "100000",
  MAX_CONTRIBUTION: "500000",
  MEMBER_DEADLINE_DAY: "10",
  UAP_TRANSFER_DEADLINE_DAY: "15",
  FUND_NAME: "UAP Umbrella Trust Fund",
};

export function getSetting(key: string): string {
  const row = one<{ value: string }>(`SELECT value FROM system_settings WHERE key = :key`, { key });
  return row?.value ?? DEFAULTS[key] ?? "";
}

export function getAllSettings(): Record<string, string> {
  const out = { ...DEFAULTS };
  const rows = require("../db").all(`SELECT key, value FROM system_settings`);
  for (const r of rows) out[r.key] = r.value;
  return out;
}

export function setSetting(key: string, value: string) {
  const existing = one<{ key: string }>(`SELECT key FROM system_settings WHERE key = :key`, { key });
  if (existing) {
    run(`UPDATE system_settings SET value = :value, updated_at = datetime('now') WHERE key = :key`, { key, value });
  } else {
    run(`INSERT INTO system_settings (key, value) VALUES (:key, :value)`, { key, value });
  }
}
