import {
  CategoriesRepository,
  type CategoryRecord,
} from "../db/repositories/categories";
import {
  applicationError,
  type ApplicationDependencies,
  type CategorySummary,
} from "./ports";

export interface CreateCategoryInput {
  name: string;
  classification: "income" | "expense";
}

export interface ArchiveCategoryInput {
  id: string;
}

function normalizeRequiredText(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    applicationError("category_not_found");
  }

  return normalized;
}

function toCategorySummary(category: CategoryRecord): CategorySummary {
  return {
    id: category.id,
    name: category.name,
    classification: category.classification,
    isSystem: category.isSystem,
    isActive: category.isActive,
    archivedAt: category.archivedAt,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

export async function createCategory(
  deps: ApplicationDependencies,
  input: CreateCategoryInput,
): Promise<CategorySummary> {
  return deps.unitOfWork.run(async (tx) => {
    const repository = new CategoriesRepository(tx);
    const category = await repository.create({
      id: deps.ids.nextId("category"),
      name: normalizeRequiredText(input.name),
      classification: input.classification,
      now: deps.clock.now(),
    });

    return toCategorySummary(category);
  });
}

export async function archiveCategory(
  deps: ApplicationDependencies,
  input: ArchiveCategoryInput,
): Promise<CategorySummary> {
  return deps.unitOfWork.run(async (tx) => {
    const repository = new CategoriesRepository(tx);
    const current = (await repository.lockByIds([input.id]))[0];
    if (!current) applicationError("category_not_found");
    if (current.isSystem) applicationError("category_system_archive_forbidden");
    const category = await repository.archive(input.id, deps.clock.now());

    return toCategorySummary(category);
  });
}
