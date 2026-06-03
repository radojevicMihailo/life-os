-- Currencies
INSERT INTO "finance_currencies" ("code", "sort_order") VALUES
  ('EUR', 0), ('RSD', 1), ('USD', 2), ('HUF', 3),
  ('BTC', 10), ('ETH', 11), ('USDC', 12), ('USDT', 13), ('DOGE', 14), ('BNB', 15), ('TON', 16),
  ('VWCE', 30), ('GOOGL', 31), ('AMD', 32)
ON CONFLICT ("code") DO NOTHING;
--> statement-breakpoint

-- Asset groups
INSERT INTO "finance_asset_groups" ("name", "sort_order") VALUES
  ('Gotovina', 0), ('Banka', 1), ('Broker', 2), ('Kripto', 3), ('Dug', 4)
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint

-- Income categories
INSERT INTO "finance_categories" ("kind", "name", "sort_order") VALUES
  ('income', 'Aktivno-Plata', 0),
  ('income', 'Aktivno-Bonus', 1),
  ('income', 'Aktivno-Edukacije', 2),
  ('income', 'Pasivno-Dividende', 3),
  ('income', 'Pasivno-Kamata (Banka)', 4),
  ('income', 'Pasivno-Izdavanje(Nekretnina)', 5),
  ('income', 'Ostalo-Poklon', 6),
  ('income', 'Setup', 7),
  ('income', 'Prihod-Greška', 8),
  ('income', 'Ostalo-Za zajednički trošak', 9)
ON CONFLICT ("kind","name") DO NOTHING;
--> statement-breakpoint

-- Expense categories
INSERT INTO "finance_categories" ("kind", "name", "sort_order") VALUES
  ('expense', 'Finansijske usluge-Održavanje računa', 0),
  ('expense', 'Finansijske usluge-Provizije', 1),
  ('expense', 'Hobiji-Borilačke veštine', 2),
  ('expense', 'Hobiji-Navak', 3),
  ('expense', 'Hobiji-Streljana', 4),
  ('expense', 'Hobiji-Snuker', 5),
  ('expense', 'Hrana-Brza hrana', 10),
  ('expense', 'Hrana-Dostava hrane', 11),
  ('expense', 'Hrana-Kafići', 12),
  ('expense', 'Hrana-Namirnice', 13),
  ('expense', 'Hrana-Pekara', 14),
  ('expense', 'Hrana-Restorani', 15),
  ('expense', 'Lična nega-Kozmetika/Higijena', 20),
  ('expense', 'Lična nega-Obuća', 21),
  ('expense', 'Lična nega-Odeća', 22),
  ('expense', 'Lična nega-šišanje i štucovanje', 23),
  ('expense', 'Obrazovanje-Fakultet', 30),
  ('expense', 'Obrazovanje-Knjige', 31),
  ('expense', 'Obrazovanje-Konferencije', 32),
  ('expense', 'Obrazovanje-Kursevi', 33),
  ('expense', 'Ostalo-Neočekivani troškovi', 40),
  ('expense', 'Ostalo-Razno', 41),
  ('expense', 'Pokloni i donacije-Donacije', 50),
  ('expense', 'Pokloni i donacije-Pokloni', 51),
  ('expense', 'Pretplate-AI', 60),
  ('expense', 'Pretplate-IDE', 61),
  ('expense', 'Prevoz-Gorivo', 70),
  ('expense', 'Prevoz-Međugradski', 71),
  ('expense', 'Prevoz-Parking', 72),
  ('expense', 'Prevoz-Pranje auta', 73),
  ('expense', 'Prevoz-Putarine', 74),
  ('expense', 'Prevoz-Registracija', 75),
  ('expense', 'Prevoz-Servis auta', 76),
  ('expense', 'Prevoz-Taksi', 77),
  ('expense', 'Prevoz-Osiguranje', 78),
  ('expense', 'Putovanja-Aktivnosti na putovanju', 80),
  ('expense', 'Putovanja-Hrana na putovanju', 81),
  ('expense', 'Putovanja-Pokloni sa putovanja', 82),
  ('expense', 'Putovanja-Putni troškovi', 83),
  ('expense', 'Putovanja-Smeštaj', 84),
  ('expense', 'Putovanja-Razno', 85),
  ('expense', 'Putovanja-Piće', 86),
  ('expense', 'Stanovanje-Kirija', 90),
  ('expense', 'Stanovanje-Nameštaj', 91),
  ('expense', 'Stanovanje-Popravke', 92),
  ('expense', 'Stanovanje-Računi', 93),
  ('expense', 'Stanovanje-Hemija', 94),
  ('expense', 'Zabava-Bioskop/Pozorište', 100),
  ('expense', 'Zabava-Dejtovi', 101),
  ('expense', 'Zabava-Izlasci', 102),
  ('expense', 'Zabava-Koncerti/Događaji', 103),
  ('expense', 'Zabava-Aktivnosti', 104),
  ('expense', 'Zdravlje i fitnes-Lekar', 110),
  ('expense', 'Zdravlje i fitnes-Lekovi', 111),
  ('expense', 'Zdravlje i fitnes-Sportska oprema', 112),
  ('expense', 'Zdravlje i fitnes-Suplementi', 113),
  ('expense', 'Zdravlje i fitnes-Teretana', 114),
  ('expense', 'Trošak-Greška', 200)
ON CONFLICT ("kind","name") DO NOTHING;
--> statement-breakpoint

-- Investment categories
INSERT INTO "finance_categories" ("kind", "name", "sort_order") VALUES
  ('investment', 'Investicija-Indeks fond', 0),
  ('investment', 'Investicija-Akcije', 1),
  ('investment', 'Investicija-Kripto', 2)
ON CONFLICT ("kind","name") DO NOTHING;
--> statement-breakpoint

-- Accounts (with asset group + currency)
INSERT INTO "finance_accounts" ("name", "asset_group_id", "currency_id", "sort_order")
SELECT v.name, ag.id, cu.id, v.sort_order FROM (VALUES
  ('Tekući račun RSD', 'Banka', 'RSD', 0),
  ('Tekući račun EUR', 'Banka', 'EUR', 1),
  ('Štednja gotovina RSD-Investicije', 'Gotovina', 'RSD', 2),
  ('Štednja gotovina EUR-Investicije', 'Gotovina', 'EUR', 3),
  ('Štednja gotovina EUR-Emergency fond', 'Gotovina', 'EUR', 4),
  ('Štedni račun RSD-Želje', 'Banka', 'RSD', 5),
  ('Štedni račun RSD-Investicije', 'Banka', 'RSD', 6),
  ('Štedni račun RSD-Emergency fond', 'Banka', 'RSD', 7),
  ('Štedni račun EUR-Investicije', 'Banka', 'EUR', 8),
  ('Potraživanja RSD', 'Dug', 'RSD', 9),
  ('Potraživanja EUR', 'Dug', 'EUR', 10),
  ('Metamask-USDC', 'Kripto', 'USDC', 11),
  ('Metamask-ETH', 'Kripto', 'ETH', 12),
  ('Metamask-BTC', 'Kripto', 'BTC', 13),
  ('IBKR VWCE', 'Broker', 'VWCE', 14),
  ('IBKR EUR-Račun', 'Broker', 'EUR', 15),
  ('IBKR GOOGL', 'Broker', 'GOOGL', 16),
  ('IBKR AMD', 'Broker', 'AMD', 17),
  ('Gotovina USD', 'Gotovina', 'USD', 18),
  ('Gotovina RSD', 'Gotovina', 'RSD', 19),
  ('Gotovina HUF', 'Gotovina', 'HUF', 20),
  ('Gotovina EUR', 'Gotovina', 'EUR', 21),
  ('Brave wallet-USDC', 'Kripto', 'USDC', 22),
  ('Brave wallet-ETH', 'Kripto', 'ETH', 23),
  ('Binance-USDT', 'Kripto', 'USDT', 24),
  ('Binance-TON', 'Kripto', 'TON', 25),
  ('Binance-ETH', 'Kripto', 'ETH', 26),
  ('Binance-DOGE', 'Kripto', 'DOGE', 27),
  ('Binance-BTC', 'Kripto', 'BTC', 28),
  ('Binance-BNB', 'Kripto', 'BNB', 29),
  ('Trezor Safe 3-BTC', 'Kripto', 'BTC', 30),
  ('Trezor Safe 3-ETH', 'Kripto', 'ETH', 31)
) AS v(name, group_name, currency_code, sort_order)
JOIN "finance_asset_groups" ag ON ag.name = v.group_name
JOIN "finance_currencies" cu ON cu.code = v.currency_code
ON CONFLICT ("name") DO NOTHING;
