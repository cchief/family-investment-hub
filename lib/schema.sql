-- FAMILY INVESTMENT HUB schema
-- Ledger-first: no table stores a "current balance". Every financial fact
-- is one row in transactions; balances are always SUM(amount) over it.
-- This makes dashboards, statements and reports reconcile by construction.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN','MEMBER')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  member_code TEXT UNIQUE NOT NULL,
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
  full_name TEXT NOT NULL,
  phone TEXT,
  join_date TEXT NOT NULL,
  monthly_commitment INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  opening_balance INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS monthly_commitments (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  expected_amount INTEGER NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(member_id, month, year)
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  stored_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_by_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contributions (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  payment_date TEXT NOT NULL,
  payment_reference TEXT,
  payment_method TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION' CHECK (status IN ('PENDING_VERIFICATION','APPROVED','REJECTED')),
  limit_overridden INTEGER NOT NULL DEFAULT 0,
  override_reason TEXT,
  verified_by_id TEXT REFERENCES users(id),
  verified_at TEXT,
  rejection_reason TEXT,
  possible_duplicate INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_contrib_member_month ON contributions(member_id, month, year);

CREATE TABLE IF NOT EXISTS contribution_evidence (
  id TEXT PRIMARY KEY,
  contribution_id TEXT NOT NULL REFERENCES contributions(id),
  document_id TEXT NOT NULL REFERENCES documents(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fund_valuations (
  id TEXT PRIMARY KEY,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  opening_balance INTEGER NOT NULL,
  new_contributions INTEGER NOT NULL,
  interest_earned INTEGER NOT NULL,
  withdrawals INTEGER NOT NULL DEFAULT 0,
  charges INTEGER NOT NULL DEFAULT 0,
  closing_balance INTEGER NOT NULL,
  commentary TEXT,
  locked INTEGER NOT NULL DEFAULT 0,
  recorded_by_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(month, year)
);

CREATE TABLE IF NOT EXISTS interest_allocations (
  id TEXT PRIMARY KEY,
  fund_valuation_id TEXT NOT NULL REFERENCES fund_valuations(id),
  member_id TEXT NOT NULL REFERENCES members(id),
  amount INTEGER NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('PROPORTIONAL','MANUAL')),
  approved_by_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(fund_valuation_id, member_id)
);

CREATE TABLE IF NOT EXISTS fund_transfers (
  id TEXT PRIMARY KEY,
  transfer_date TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reference TEXT,
  transferred_by_id TEXT NOT NULL REFERENCES users(id),
  document_id TEXT REFERENCES documents(id),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- The ledger. Immutable: corrections are reversing rows, never UPDATE/DELETE.
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id),
  type TEXT NOT NULL CHECK (type IN ('CONTRIBUTION','INTEREST_ALLOCATION','WITHDRAWAL','OPENING_BALANCE','ADJUSTMENT')),
  amount INTEGER NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  description TEXT NOT NULL,
  contribution_id TEXT UNIQUE REFERENCES contributions(id),
  interest_allocation_id TEXT UNIQUE REFERENCES interest_allocations(id),
  reversal_of_id TEXT REFERENCES transactions(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_txn_member_month ON transactions(member_id, month, year);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'IN_APP',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Append-only. Application code must never UPDATE or DELETE a row here.
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
