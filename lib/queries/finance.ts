import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  account,
  assetGroup,
  bucket,
  currency,
  transaction,
  transactionCategory,
  transactionType,
  type Account,
  type AssetGroup,
  type Bucket,
  type Currency,
  type Transaction,
  type TransactionCategory,
  type TransactionTypeRow,
} from "@/db/schema/finance";

export async function getCurrencies(): Promise<Currency[]> {
  return db.select().from(currency).orderBy(asc(currency.sortOrder), asc(currency.code));
}

export async function getAssetGroups(): Promise<AssetGroup[]> {
  return db.select().from(assetGroup).orderBy(asc(assetGroup.sortOrder), asc(assetGroup.name));
}

export async function getAccounts(): Promise<Account[]> {
  return db.select().from(account).orderBy(asc(account.sortOrder), asc(account.name));
}

export async function getCategories(): Promise<TransactionCategory[]> {
  return db
    .select()
    .from(transactionCategory)
    .orderBy(asc(transactionCategory.sortOrder), asc(transactionCategory.name));
}

export async function getTransactionTypes(): Promise<TransactionTypeRow[]> {
  return db
    .select()
    .from(transactionType)
    .orderBy(asc(transactionType.sortOrder), asc(transactionType.label));
}

export async function getTransactions(): Promise<Transaction[]> {
  return db
    .select()
    .from(transaction)
    .orderBy(desc(transaction.occurredOn), desc(transaction.createdAt));
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  const [row] = await db.select().from(transaction).where(eq(transaction.id, id)).limit(1);
  return row ?? null;
}

export async function getBuckets(): Promise<Bucket[]> {
  return db.select().from(bucket).orderBy(asc(bucket.sortOrder), asc(bucket.name));
}
