import { asc, eq, inArray, or } from "drizzle-orm";

import { applicationError, type CategorySummary } from "../../application/ports";
import type { DbTx } from "../client";
import { categories } from "../schema";

export interface CategoryRecord extends CategorySummary {
  classification: "income" | "expense";
}

export class CategoriesRepository {
  constructor(private readonly tx: DbTx) {}

  async create(input: {
    id: string;
    name: string;
    classification: "income" | "expense";
    now: Date;
  }): Promise<CategoryRecord> {
    const [category] = await this.tx
      .insert(categories)
      .values({
        id: input.id,
        name: input.name,
        classification: input.classification,
        isSystem: false,
        isActive: true,
        archivedAt: null,
        createdAt: input.now,
        updatedAt: input.now,
      })
      .returning();

    if (!category) {
      applicationError("category_not_found");
    }

    return category as CategoryRecord;
  }

  async archive(id: string, archivedAt: Date): Promise<CategoryRecord> {
    const [category] = await this.tx
      .update(categories)
      .set({
        archivedAt,
        isActive: false,
        updatedAt: archivedAt,
      })
      .where(eq(categories.id, id))
      .returning();

    if (!category) {
      applicationError("category_not_found");
    }

    return category as CategoryRecord;
  }

  async lockByIds(ids: string[]): Promise<CategoryRecord[]> {
    const uniqueIds = [...new Set(ids)].sort();

    if (uniqueIds.length === 0) {
      return [];
    }

    const rows = await this.tx
      .select()
      .from(categories)
      .where(inArray(categories.id, uniqueIds))
      .orderBy(asc(categories.id))
      .for("update");

    return rows as CategoryRecord[];
  }

  async getOrCreateSystemCategory(input: {
    id: string;
    name: string;
    classification: "income" | "expense";
    now: Date;
  }): Promise<CategoryRecord> {
    const existing = await this.tx
      .select()
      .from(categories)
      .where(or(eq(categories.id, input.id), eq(categories.name, input.name)))
      .orderBy(asc(categories.id))
      .for("update");
    const candidate = existing.find((category) => category.name === input.name) ??
      existing.find((category) => category.id === input.id);

    if (candidate) {
      if (!candidate.isActive) {
        applicationError("category_inactive");
      }
      if (candidate.classification !== input.classification) {
        applicationError("category_classification_mismatch");
      }
      return candidate as CategoryRecord;
    }

    const [created] = await this.tx
      .insert(categories)
      .values({
        id: input.id,
        name: input.name,
        classification: input.classification,
        isSystem: true,
        isActive: true,
        archivedAt: null,
        createdAt: input.now,
        updatedAt: input.now,
      })
      .onConflictDoNothing()
      .returning();

    if (created) {
      return created as CategoryRecord;
    }

    const concurrent = await this.tx
      .select()
      .from(categories)
      .where(or(eq(categories.id, input.id), eq(categories.name, input.name)))
      .orderBy(asc(categories.id))
      .for("update");
    const concurrentCandidate = concurrent.find(
      (category) => category.name === input.name,
    ) ?? concurrent.find((category) => category.id === input.id);

    if (!concurrentCandidate) {
      applicationError("category_not_found");
    }
    if (!concurrentCandidate.isActive) {
      applicationError("category_inactive");
    }
    if (concurrentCandidate.classification !== input.classification) {
      applicationError("category_classification_mismatch");
    }

    return concurrentCandidate as CategoryRecord;
  }
}
