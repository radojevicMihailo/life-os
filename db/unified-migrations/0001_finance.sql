DO $$ BEGIN
  CREATE TYPE finance_journal_transaction_status AS ENUM ('draft', 'posted', 'reversed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE finance_journal_transaction_source AS ENUM ('web', 'shortcut', 'seed', 'system');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE finance_journal_transaction_type AS ENUM (
    'income',
    'expense',
    'transfer',
    'foreign_exchange',
    'opening_balance',
    'correction',
    'receivable_out',
    'receivable_repayment',
    'investment_trade',
    'fee'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE finance_instrument_class AS ENUM (
    'stock',
    'etf',
    'crypto',
    'bond',
    'real_estate',
    'precious_metal',
    'manual'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE finance_instrument_valuation_method AS ENUM ('market_quote', 'manual');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE finance_investment_transaction_type AS ENUM ('buy', 'sell', 'dividend', 'fee');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE finance_investment_transaction_status AS ENUM ('posted', 'reversed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE finance_provider_record_status AS ENUM ('valid', 'stale', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE finance_manual_override_kind AS ENUM ('exchange_rate', 'market_quote');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE finance_access_setting_kind AS ENUM ('web_access_token', 'shortcut_token', 'session_signing');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE finance_idempotency_status AS ENUM ('started', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS finance_currencies (
  code text PRIMARY KEY,
  name text NOT NULL,
  minor_unit text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT currencies_code_iso_check CHECK (code ~ '^[A-Z]{3}$'),
  CONSTRAINT currencies_active_timestamp_check CHECK (
    (is_active AND activated_at IS NOT NULL)
    OR (NOT is_active)
  )
);

CREATE TABLE IF NOT EXISTS finance_accounts (
  id text PRIMARY KEY,
  name text NOT NULL,
  classification text NOT NULL,
  subtype text NOT NULL,
  currency_code text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounts_currency_code_currencies_code_fk
    FOREIGN KEY (currency_code) REFERENCES finance_currencies(code) DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT accounts_classification_check
    CHECK (classification IN ('asset', 'liability', 'receivable', 'equity', 'income', 'expense')),
  CONSTRAINT accounts_archived_at_consistency_check CHECK (
    (is_active AND archived_at IS NULL)
    OR (NOT is_active AND archived_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS accounts_active_name_unique_idx
  ON finance_accounts (name)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS finance_categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  classification text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_classification_check CHECK (classification IN ('income', 'expense')),
  CONSTRAINT categories_archived_at_consistency_check CHECK (
    (is_active AND archived_at IS NULL)
    OR (NOT is_active AND archived_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS categories_active_name_unique_idx
  ON finance_categories (name)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS finance_journal_transactions (
  id text PRIMARY KEY,
  type finance_journal_transaction_type NOT NULL,
  occurred_at timestamptz NOT NULL,
  description text,
  source finance_journal_transaction_source NOT NULL,
  status finance_journal_transaction_status NOT NULL DEFAULT 'posted',
  correction_of_id text,
  corrected_by_id text,
  external_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT journal_transactions_correction_of_id_journal_transactions_id_fk
    FOREIGN KEY (correction_of_id) REFERENCES finance_journal_transactions(id) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT journal_transactions_corrected_by_id_journal_transactions_id_fk
    FOREIGN KEY (corrected_by_id) REFERENCES finance_journal_transactions(id) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS journal_transactions_occurred_at_idx
  ON finance_journal_transactions (occurred_at DESC NULLS LAST, id);

CREATE TABLE IF NOT EXISTS finance_journal_postings (
  id text PRIMARY KEY,
  transaction_id text NOT NULL,
  account_id text NOT NULL,
  currency_code text NOT NULL,
  amount numeric(38, 18) NOT NULL,
  category_id text,
  counterparty text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT journal_postings_transaction_id_journal_transactions_id_fk
    FOREIGN KEY (transaction_id) REFERENCES finance_journal_transactions(id) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT journal_postings_account_id_accounts_id_fk
    FOREIGN KEY (account_id) REFERENCES finance_accounts(id) DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT journal_postings_currency_code_currencies_code_fk
    FOREIGN KEY (currency_code) REFERENCES finance_currencies(code) DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT journal_postings_category_id_categories_id_fk
    FOREIGN KEY (category_id) REFERENCES finance_categories(id) DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT journal_postings_amount_nonzero_check CHECK (amount <> 0)
);

CREATE INDEX IF NOT EXISTS journal_postings_account_occurred_idx
  ON finance_journal_postings (account_id, transaction_id);

CREATE TABLE IF NOT EXISTS finance_budget_limits (
  id text PRIMARY KEY,
  category_id text NOT NULL,
  month date NOT NULL,
  currency_code text NOT NULL,
  amount numeric(38, 18) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT budget_limits_category_id_categories_id_fk
    FOREIGN KEY (category_id) REFERENCES finance_categories(id) DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT budget_limits_currency_code_currencies_code_fk
    FOREIGN KEY (currency_code) REFERENCES finance_currencies(code) DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT budget_limits_amount_positive_check CHECK (amount > 0),
  CONSTRAINT budget_limits_category_month_unique UNIQUE (category_id, month)
);

CREATE TABLE IF NOT EXISTS finance_budget_periods (
  id text PRIMARY KEY,
  category_id text NOT NULL,
  month date NOT NULL,
  currency_code text NOT NULL,
  limit_amount numeric(38, 18) NOT NULL,
  carry_in_amount numeric(38, 18) NOT NULL,
  spending_amount numeric(38, 18) NOT NULL,
  remaining_amount numeric(38, 18) NOT NULL,
  recomputed_at timestamptz NOT NULL,
  CONSTRAINT budget_periods_category_id_categories_id_fk
    FOREIGN KEY (category_id) REFERENCES finance_categories(id) DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT budget_periods_currency_code_currencies_code_fk
    FOREIGN KEY (currency_code) REFERENCES finance_currencies(code) DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT budget_periods_category_month_unique UNIQUE (category_id, month)
);

CREATE INDEX IF NOT EXISTS budget_periods_recompute_idx
  ON finance_budget_periods (category_id, month);

CREATE TABLE IF NOT EXISTS finance_goals (
  id text PRIMARY KEY,
  name text NOT NULL,
  account_id text NOT NULL,
  target_currency_code text NOT NULL,
  target_amount numeric(38, 18) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT goals_account_id_accounts_id_fk
    FOREIGN KEY (account_id) REFERENCES finance_accounts(id) DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT goals_target_currency_code_currencies_code_fk
    FOREIGN KEY (target_currency_code) REFERENCES finance_currencies(code) DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT goals_target_amount_positive_check CHECK (target_amount > 0),
  CONSTRAINT goals_archived_at_consistency_check CHECK (
    (is_active AND archived_at IS NULL)
    OR (NOT is_active AND archived_at IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS finance_instruments (
  id text PRIMARY KEY,
  symbol text NOT NULL,
  name text NOT NULL,
  class finance_instrument_class NOT NULL,
  valuation_method finance_instrument_valuation_method NOT NULL DEFAULT 'market_quote',
  quote_currency_code text NOT NULL,
  provider text,
  provider_id text,
  isin text,
  exchange text,
  is_active boolean NOT NULL DEFAULT true,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT instruments_quote_currency_code_currencies_code_fk
    FOREIGN KEY (quote_currency_code) REFERENCES finance_currencies(code) DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT instruments_archived_at_consistency_check CHECK (
    (is_active AND archived_at IS NULL)
    OR (NOT is_active AND archived_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS instruments_symbol_unique_idx
  ON finance_instruments (symbol);

CREATE UNIQUE INDEX IF NOT EXISTS instruments_provider_id_unique_idx
  ON finance_instruments (provider, provider_id)
  WHERE provider IS NOT NULL AND provider_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS finance_investment_accounts (
  id text PRIMARY KEY,
  name text NOT NULL,
  cash_account_id text NOT NULL,
  provider text,
  is_active boolean NOT NULL DEFAULT true,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT investment_accounts_cash_account_id_accounts_id_fk
    FOREIGN KEY (cash_account_id) REFERENCES finance_accounts(id) DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT investment_accounts_archived_at_consistency_check CHECK (
    (is_active AND archived_at IS NULL)
    OR (NOT is_active AND archived_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS investment_accounts_active_name_unique_idx
  ON finance_investment_accounts (name)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS finance_investment_transactions (
  id text PRIMARY KEY,
  investment_account_id text NOT NULL,
  instrument_id text NOT NULL,
  journal_transaction_id text,
  type finance_investment_transaction_type NOT NULL,
  status finance_investment_transaction_status NOT NULL DEFAULT 'posted',
  occurred_at timestamptz NOT NULL,
  quantity numeric(48, 24),
  trade_currency_code text NOT NULL,
  gross_amount numeric(38, 18),
  fee_amount numeric(38, 18),
  trade_fx_rate_to_eur numeric(38, 18),
  correction_of_id text,
  corrected_by_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT investment_transactions_investment_account_id_investment_accounts_id_fk
    FOREIGN KEY (investment_account_id) REFERENCES finance_investment_accounts(id) DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT investment_transactions_instrument_id_instruments_id_fk
    FOREIGN KEY (instrument_id) REFERENCES finance_instruments(id) DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT investment_transactions_journal_transaction_id_journal_transactions_id_fk
    FOREIGN KEY (journal_transaction_id) REFERENCES finance_journal_transactions(id) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT investment_transactions_trade_currency_code_currencies_code_fk
    FOREIGN KEY (trade_currency_code) REFERENCES finance_currencies(code) DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT investment_transactions_correction_of_id_investment_transactions_id_fk
    FOREIGN KEY (correction_of_id) REFERENCES finance_investment_transactions(id) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT investment_transactions_corrected_by_id_investment_transactions_id_fk
    FOREIGN KEY (corrected_by_id) REFERENCES finance_investment_transactions(id) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS investment_transactions_account_occurred_idx
  ON finance_investment_transactions (investment_account_id, occurred_at DESC NULLS LAST, id);

CREATE TABLE IF NOT EXISTS finance_tax_lots (
  id text PRIMARY KEY,
  investment_transaction_id text NOT NULL,
  instrument_id text NOT NULL,
  acquired_at timestamptz NOT NULL,
  quantity numeric(48, 24) NOT NULL,
  remaining_quantity numeric(48, 24) NOT NULL,
  cost_currency_code text NOT NULL,
  cost_amount numeric(38, 18) NOT NULL,
  fee_amount numeric(38, 18) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tax_lots_investment_transaction_id_investment_transactions_id_fk
    FOREIGN KEY (investment_transaction_id) REFERENCES finance_investment_transactions(id) DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT tax_lots_instrument_id_instruments_id_fk
    FOREIGN KEY (instrument_id) REFERENCES finance_instruments(id) DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT tax_lots_cost_currency_code_currencies_code_fk
    FOREIGN KEY (cost_currency_code) REFERENCES finance_currencies(code) DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT tax_lots_quantity_positive_check CHECK (quantity > 0),
  CONSTRAINT tax_lots_remaining_quantity_check CHECK (
    remaining_quantity >= 0
    AND remaining_quantity <= quantity
  )
);

CREATE INDEX IF NOT EXISTS tax_lots_open_fifo_idx
  ON finance_tax_lots (instrument_id, acquired_at, id)
  WHERE remaining_quantity > 0;

CREATE TABLE IF NOT EXISTS finance_lot_disposals (
  id text PRIMARY KEY,
  tax_lot_id text NOT NULL,
  investment_transaction_id text NOT NULL,
  disposed_at timestamptz NOT NULL,
  quantity numeric(48, 24) NOT NULL,
  proceeds_currency_code text NOT NULL,
  proceeds_amount numeric(38, 18) NOT NULL,
  cost_basis_amount numeric(38, 18) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lot_disposals_tax_lot_id_tax_lots_id_fk
    FOREIGN KEY (tax_lot_id) REFERENCES finance_tax_lots(id) DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT lot_disposals_investment_transaction_id_investment_transactions_id_fk
    FOREIGN KEY (investment_transaction_id) REFERENCES finance_investment_transactions(id) DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT lot_disposals_proceeds_currency_code_currencies_code_fk
    FOREIGN KEY (proceeds_currency_code) REFERENCES finance_currencies(code) DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT lot_disposals_quantity_positive_check CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS finance_exchange_rates (
  id text PRIMARY KEY,
  base_currency_code text NOT NULL,
  quote_currency_code text NOT NULL,
  rate numeric(38, 18) NOT NULL,
  provider text NOT NULL,
  provider_timestamp timestamptz NOT NULL,
  retrieved_at timestamptz NOT NULL,
  status finance_provider_record_status NOT NULL,
  raw_payload jsonb,
  CONSTRAINT exchange_rates_base_currency_code_currencies_code_fk
    FOREIGN KEY (base_currency_code) REFERENCES finance_currencies(code) DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT exchange_rates_quote_currency_code_currencies_code_fk
    FOREIGN KEY (quote_currency_code) REFERENCES finance_currencies(code) DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT exchange_rates_rate_positive_check CHECK (rate > 0)
);

CREATE INDEX IF NOT EXISTS exchange_rates_lookup_idx
  ON finance_exchange_rates (base_currency_code, quote_currency_code, provider_timestamp DESC NULLS LAST, id);

CREATE TABLE IF NOT EXISTS finance_market_quotes (
  id text PRIMARY KEY,
  instrument_id text NOT NULL,
  quote_currency_code text NOT NULL,
  price numeric(38, 18) NOT NULL,
  provider text NOT NULL,
  provider_timestamp timestamptz NOT NULL,
  retrieved_at timestamptz NOT NULL,
  status finance_provider_record_status NOT NULL,
  raw_payload jsonb,
  CONSTRAINT market_quotes_instrument_id_instruments_id_fk
    FOREIGN KEY (instrument_id) REFERENCES finance_instruments(id) DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT market_quotes_quote_currency_code_currencies_code_fk
    FOREIGN KEY (quote_currency_code) REFERENCES finance_currencies(code) DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT market_quotes_price_positive_check CHECK (price > 0)
);

CREATE INDEX IF NOT EXISTS market_quotes_lookup_idx
  ON finance_market_quotes (instrument_id, quote_currency_code, provider_timestamp DESC NULLS LAST, id);

CREATE TABLE IF NOT EXISTS finance_manual_valuation_overrides (
  id text PRIMARY KEY,
  kind finance_manual_override_kind NOT NULL,
  base_currency_code text,
  quote_currency_code text,
  instrument_id text,
  value numeric(38, 18) NOT NULL,
  effective_at timestamptz NOT NULL,
  cleared_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT manual_valuation_overrides_base_currency_code_currencies_code_fk
    FOREIGN KEY (base_currency_code) REFERENCES finance_currencies(code) DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT manual_valuation_overrides_quote_currency_code_currencies_code_fk
    FOREIGN KEY (quote_currency_code) REFERENCES finance_currencies(code) DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT manual_valuation_overrides_instrument_id_instruments_id_fk
    FOREIGN KEY (instrument_id) REFERENCES finance_instruments(id) DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT manual_valuation_overrides_value_positive_check CHECK (value > 0),
  CONSTRAINT manual_valuation_overrides_target_check CHECK (
    (kind = 'exchange_rate' AND base_currency_code IS NOT NULL AND quote_currency_code IS NOT NULL AND instrument_id IS NULL)
    OR (kind = 'market_quote' AND instrument_id IS NOT NULL AND base_currency_code IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS manual_valuation_overrides_active_unique_idx
  ON finance_manual_valuation_overrides (kind, base_currency_code, quote_currency_code, instrument_id)
  WHERE cleared_at IS NULL;

CREATE TABLE IF NOT EXISTS finance_provider_refresh_runs (
  id text PRIMARY KEY,
  provider text NOT NULL,
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  status finance_provider_record_status NOT NULL,
  attempted_count integer NOT NULL DEFAULT 0,
  succeeded_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  error text,
  CONSTRAINT provider_refresh_runs_counts_nonnegative_check CHECK (
    attempted_count >= 0
    AND succeeded_count >= 0
    AND failed_count >= 0
  )
);

CREATE INDEX IF NOT EXISTS provider_refresh_runs_provider_started_idx
  ON finance_provider_refresh_runs (provider, started_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS finance_access_settings (
  id text PRIMARY KEY,
  kind finance_access_setting_kind NOT NULL,
  token_hash text NOT NULL,
  version text NOT NULL,
  rotated_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS access_settings_kind_unique_idx
  ON finance_access_settings (kind);

CREATE TABLE IF NOT EXISTS finance_idempotency_records (
  id text PRIMARY KEY,
  scope text NOT NULL,
  key text NOT NULL,
  request_fingerprint text NOT NULL,
  status finance_idempotency_status NOT NULL,
  result_transaction_id text,
  response_body jsonb,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT idempotency_records_result_transaction_id_journal_transactions_id_fk
    FOREIGN KEY (result_transaction_id) REFERENCES finance_journal_transactions(id) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT idempotency_records_completed_consistency_check CHECK (
    (status = 'completed' AND completed_at IS NOT NULL)
    OR (status <> 'completed')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idempotency_records_scope_key_idx
  ON finance_idempotency_records (scope, key);

CREATE OR REPLACE FUNCTION prevent_posted_journal_transaction_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'posted' AND TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'posted journal transactions are immutable';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF OLD.status = 'posted'
     AND TG_OP = 'UPDATE'
     AND (
       NEW.type IS DISTINCT FROM OLD.type
       OR NEW.occurred_at IS DISTINCT FROM OLD.occurred_at
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.source IS DISTINCT FROM OLD.source
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.correction_of_id IS DISTINCT FROM OLD.correction_of_id
       OR NEW.external_reference IS DISTINCT FROM OLD.external_reference
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
     ) THEN
    RAISE EXCEPTION 'posted journal transactions are immutable';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_posted_journal_transaction_update ON finance_journal_transactions;
CREATE TRIGGER trg_prevent_posted_journal_transaction_update
BEFORE UPDATE OR DELETE ON finance_journal_transactions
FOR EACH ROW
EXECUTE FUNCTION prevent_posted_journal_transaction_update();

CREATE OR REPLACE FUNCTION prevent_posted_journal_posting_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_status finance_journal_transaction_status;
BEGIN
  SELECT status INTO parent_status
    FROM finance_journal_transactions
   WHERE id = OLD.transaction_id;

  IF parent_status = 'posted' THEN
    RAISE EXCEPTION 'posted journal postings are immutable';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_posted_journal_posting_change ON finance_journal_postings;
CREATE TRIGGER trg_prevent_posted_journal_posting_change
BEFORE UPDATE OR DELETE ON finance_journal_postings
FOR EACH ROW
EXECUTE FUNCTION prevent_posted_journal_posting_change();

ALTER TABLE "finance_investment_transactions" ALTER COLUMN "trade_fx_rate_to_eur" SET NOT NULL;