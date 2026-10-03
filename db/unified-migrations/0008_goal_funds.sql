-- Preserve legacy account references for explanation; goals are now independent funds.
-- Existing explicit account purposes remain unchanged. No balances are auto-reserved.
ALTER TABLE finance_goals ALTER COLUMN account_id DROP NOT NULL;
-- Rollback requires assigning an account to newly created unlinked goals before
-- ALTER TABLE finance_goals ALTER COLUMN account_id SET NOT NULL.
