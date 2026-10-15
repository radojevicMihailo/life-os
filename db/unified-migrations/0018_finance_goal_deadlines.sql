ALTER TABLE finance_goals ADD COLUMN target_date date;
ALTER TABLE finance_goals ADD CONSTRAINT goals_target_date_range CHECK(target_date IS NULL OR target_date BETWEEN '1900-01-01' AND '2100-12-31');
