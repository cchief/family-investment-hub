import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

// Single shared SQLite connection (file-backed), created on first import.
// node:sqlite is Node's built-in driver (stable enough for this MVP) — it
// needs no native binary download, which matters in network-restricted
// environments. Swapping to Postgres later means replacing this file only;
// nothing above lib/repo/* needs to change its call shape.

const DB_PATH = path.join(process.cwd(), "dev.db");
const SCHEMA_PATH = path.join(process.cwd(), "lib", "schema.sql");

declare global {
  // eslint-disable-next-line no-var
  var __fihDb: DatabaseSync | undefined;
}

function init(): DatabaseSync {
  const isNew = !fs.existsSync(DB_PATH);
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA foreign_keys = ON;");
  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  db.exec(schema);
  if (isNew) {
    // eslint-disable-next-line no-console
    console.log("[db] created new SQLite database at", DB_PATH);
  }
  return db;
}

export const db: DatabaseSync = global.__fihDb ?? init();
if (process.env.NODE_ENV !== "production") global.__fihDb = db;

/** Run fn inside a SQLite transaction; rolls back on throw. */
export function withTransaction<T>(fn: () => T): T {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

/** Convert a prepared-statement row (unknown types) to a plain object. */
export function one<T = any>(sql: string, params: Record<string, any> = {}): T | undefined {
  const stmt = db.prepare(sql);
  const row = stmt.get(params) as any;
  return row ? ({ ...row } as T) : undefined;
}

export function all<T = any>(sql: string, params: Record<string, any> = {}): T[] {
  const stmt = db.prepare(sql);
  const rows = stmt.all(params) as any[];
  return rows.map((row) => ({ ...row })) as T[];
}

export function run(sql: string, params: Record<string, any> = {}) {
  const stmt = db.prepare(sql);
  return stmt.run(params);
}
