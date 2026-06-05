CREATE TABLE "finance_subcategories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "category_id" uuid NOT NULL REFERENCES "finance_categories"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "finance_subcategory_cat_name_idx" ON "finance_subcategories" ("category_id", "name");
--> statement-breakpoint
ALTER TABLE "finance_transactions" ADD COLUMN "subcategory_id" uuid REFERENCES "finance_subcategories"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX "finance_tx_subcategory_idx" ON "finance_transactions" ("subcategory_id");
--> statement-breakpoint
DO $migrate$
DECLARE
  rec RECORD;
  v_prefix text;
  v_suffix text;
  v_dash_pos int;
  v_subcat_id uuid;
BEGIN
  CREATE TEMP TABLE _cat_split (
    old_id uuid PRIMARY KEY,
    kind text NOT NULL,
    prefix text NOT NULL,
    suffix text,
    sort_order int NOT NULL
  ) ON COMMIT DROP;

  FOR rec IN SELECT id, kind::text AS kind, name, sort_order FROM finance_categories LOOP
    v_dash_pos := position('-' in rec.name);
    IF v_dash_pos > 0 THEN
      v_prefix := btrim(substring(rec.name from 1 for v_dash_pos - 1));
      v_suffix := btrim(substring(rec.name from v_dash_pos + 1));
      IF v_prefix = '' THEN
        v_prefix := btrim(rec.name);
        v_suffix := NULL;
      END IF;
      IF v_suffix = '' THEN v_suffix := NULL; END IF;
    ELSE
      v_prefix := btrim(rec.name);
      v_suffix := NULL;
    END IF;
    INSERT INTO _cat_split VALUES (rec.id, rec.kind, v_prefix, v_suffix, rec.sort_order);
  END LOOP;

  CREATE TEMP TABLE _cat_canonical (
    kind text NOT NULL,
    prefix text NOT NULL,
    canonical_id uuid NOT NULL,
    PRIMARY KEY (kind, prefix)
  ) ON COMMIT DROP;

  INSERT INTO _cat_canonical (kind, prefix, canonical_id)
  SELECT DISTINCT ON (kind, prefix) kind, prefix, old_id
  FROM _cat_split
  ORDER BY kind, prefix, sort_order, old_id;

  UPDATE finance_categories c
  SET name = cc.prefix
  FROM _cat_canonical cc
  WHERE c.id = cc.canonical_id;

  CREATE TEMP TABLE _subcat_map (
    old_cat_id uuid PRIMARY KEY,
    new_cat_id uuid NOT NULL,
    new_subcat_id uuid
  ) ON COMMIT DROP;

  FOR rec IN
    SELECT s.old_id, s.suffix, cc.canonical_id
    FROM _cat_split s
    JOIN _cat_canonical cc ON cc.kind = s.kind AND cc.prefix = s.prefix
  LOOP
    IF rec.suffix IS NOT NULL THEN
      INSERT INTO finance_subcategories (category_id, name, sort_order)
      VALUES (rec.canonical_id, rec.suffix, 0)
      ON CONFLICT (category_id, name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id INTO v_subcat_id;
    ELSE
      v_subcat_id := NULL;
    END IF;
    INSERT INTO _subcat_map VALUES (rec.old_id, rec.canonical_id, v_subcat_id);
  END LOOP;

  UPDATE finance_transactions t
  SET category_id = m.new_cat_id,
      subcategory_id = m.new_subcat_id
  FROM _subcat_map m
  WHERE t.category_id = m.old_cat_id;

  DELETE FROM finance_categories c
  WHERE c.id IN (
    SELECT old_id FROM _cat_split
    WHERE old_id NOT IN (SELECT canonical_id FROM _cat_canonical)
  );
END
$migrate$;
