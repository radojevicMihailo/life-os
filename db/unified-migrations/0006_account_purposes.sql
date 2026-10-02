-- Money earmarked within an account; these rows never post to the ledger.
-- Rollback: DROP TABLE finance_account_purposes;
CREATE TABLE finance_account_purposes (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES finance_accounts(id),
  currency_code text NOT NULL REFERENCES finance_currencies(code),
  goal_id text REFERENCES finance_goals(id),
  budget_limit_id text REFERENCES finance_budget_limits(id),
  amount numeric(38,18) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_purposes_amount_positive_check CHECK (amount > 0),
  CONSTRAINT account_purposes_one_target_check CHECK (num_nonnulls(goal_id, budget_limit_id) = 1)
);
CREATE INDEX account_purposes_account_idx ON finance_account_purposes(account_id);
CREATE UNIQUE INDEX account_purposes_goal_unique_idx ON finance_account_purposes(account_id, goal_id);
CREATE UNIQUE INDEX account_purposes_budget_unique_idx ON finance_account_purposes(account_id, budget_limit_id);
