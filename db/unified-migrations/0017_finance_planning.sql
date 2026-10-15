CREATE TABLE finance_plan_rules (
 id text PRIMARY KEY, name text NOT NULL, type text NOT NULL CHECK(type IN ('income','expense')),
 account_id text NOT NULL REFERENCES finance_accounts(id), category_id text NOT NULL REFERENCES finance_categories(id),
 amount numeric(38,18) NOT NULL CHECK(amount>0), start_date date NOT NULL, end_date date,
 frequency text NOT NULL CHECK(frequency IN ('once','weekly','monthly','yearly')), is_primary_income boolean NOT NULL DEFAULT false,
 archived_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(start_date BETWEEN '1900-01-01' AND '2100-12-31' AND (end_date IS NULL OR end_date BETWEEN start_date AND '2100-12-31')),
 CHECK(NOT is_primary_income OR type='income')
);
CREATE INDEX plan_account_idx ON finance_plan_rules(account_id);
CREATE INDEX plan_category_idx ON finance_plan_rules(category_id);
CREATE TABLE finance_plan_occurrences (
 id text PRIMARY KEY, rule_id text NOT NULL REFERENCES finance_plan_rules(id), due_date date NOT NULL,
 status text NOT NULL, journal_transaction_id text REFERENCES finance_journal_transactions(id), snapshot jsonb,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((status='confirmed' AND journal_transaction_id IS NOT NULL AND snapshot IS NOT NULL) OR (status='skipped' AND journal_transaction_id IS NULL))
);
CREATE UNIQUE INDEX plan_occurrence_unique ON finance_plan_occurrences(rule_id,due_date);
CREATE UNIQUE INDEX plan_occurrence_journal_unique ON finance_plan_occurrences(journal_transaction_id);
CREATE TABLE finance_cash_account_preferences(account_id text PRIMARY KEY REFERENCES finance_accounts(id), included boolean NOT NULL);
