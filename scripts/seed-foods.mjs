import { readFile } from 'node:fs/promises';
import pg from 'pg';

const catalog = JSON.parse(await readFile(new URL('../lib/foods/catalog.json', import.meta.url), 'utf8'));
const foods = catalog.foods;
if (!Array.isArray(foods) || foods.length === 0) {
  throw new Error('Food catalog must contain foods');
}
for (const key of ['id', 'name', 'fdcId']) {
  if (new Set(foods.map(food => food[key])).size !== foods.length) {
    throw new Error(`Food catalog contains duplicate ${key} values`);
  }
}
for (const food of foods) {
  if (!food.name || !Number.isInteger(food.fdcId)) throw new Error('Invalid food provenance');
  for (const key of ['kcalPer100g', 'proteinPer100g', 'carbsPer100g', 'fatPer100g']) {
    const value = food[key];
    const max = key === 'kcalPer100g' ? 1000 : 100;
    if (!Number.isFinite(value) || value < 0 || value > max) {
      throw new Error(`Invalid ${key} for ${food.name}`);
    }
  }
}
if (process.argv.includes('--dry-run')) {
  console.log(`Validated ${foods.length} foods from ${catalog.provider}, ${catalog.dataset}; no database changes.`);
} else {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let inserted = 0;
    for (const food of foods) {
      const result = await client.query(
        `INSERT INTO food_items (id, name, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, source)
         VALUES ($1, $2, $3, $4, $5, $6, 'manual') ON CONFLICT (id) DO NOTHING`,
        [food.id, food.name, food.kcalPer100g, food.proteinPer100g, food.carbsPer100g, food.fatPer100g],
      );
      inserted += result.rowCount ?? 0;
    }
    await client.query('COMMIT');
    console.log(`Food catalog: inserted ${inserted}; preserved ${foods.length - inserted} existing catalog records.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
