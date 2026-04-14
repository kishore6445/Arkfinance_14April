-- Create budget tables for transaction-level budget control
-- Date: 2026-04-04

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category VARCHAR(120) NOT NULL,
  period_type VARCHAR(20) NOT NULL DEFAULT 'MONTHLY'
    CHECK (period_type IN ('MONTHLY', 'QUARTERLY', 'YEARLY')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  budget_amount NUMERIC(14,2) NOT NULL CHECK (budget_amount >= 0),
  alert_threshold_percent NUMERIC(5,2) NOT NULL DEFAULT 80
    CHECK (alert_threshold_percent >= 0 AND alert_threshold_percent <= 100),
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_budgets_period_range CHECK (period_end >= period_start)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_budgets_scope
  ON budgets (organization_id, category, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_budgets_org_status
  ON budgets (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_budgets_org_period
  ON budgets (organization_id, period_start, period_end);

CREATE TABLE IF NOT EXISTS budget_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tracking_month DATE NOT NULL,
  budgeted_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (budgeted_amount >= 0),
  actual_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (actual_amount >= 0),
  reserved_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (reserved_amount >= 0),
  variance_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  variance_percent NUMERIC(7,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'ON_TRACK'
    CHECK (status IN ('ON_TRACK', 'WARNING', 'OVERSPENT')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_budget_tracking_month_start
    CHECK (tracking_month = date_trunc('month', tracking_month)::date)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_budget_tracking_budget_month
  ON budget_tracking (budget_id, tracking_month);

CREATE INDEX IF NOT EXISTS idx_budget_tracking_org_month
  ON budget_tracking (organization_id, tracking_month);

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_budget_id
  ON transactions (budget_id);

CREATE OR REPLACE FUNCTION set_row_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_budgets_set_updated_at ON budgets;
CREATE TRIGGER trg_budgets_set_updated_at
BEFORE UPDATE ON budgets
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();

DROP TRIGGER IF EXISTS trg_budget_tracking_set_updated_at ON budget_tracking;
CREATE TRIGGER trg_budget_tracking_set_updated_at
BEFORE UPDATE ON budget_tracking
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();

COMMIT;
