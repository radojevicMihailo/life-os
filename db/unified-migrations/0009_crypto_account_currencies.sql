-- Native wallet denominations: satoshis (BTC) and wei (ETH).
INSERT INTO finance_currencies (code, name, minor_unit, is_active, activated_at)
VALUES ('BTC', 'Bitcoin', '8', true, now()),
       ('ETH', 'Ethereum', '18', true, now())
ON CONFLICT (code) DO UPDATE
SET minor_unit = EXCLUDED.minor_unit,
    is_active = true,
    activated_at = COALESCE(finance_currencies.activated_at, EXCLUDED.activated_at);
