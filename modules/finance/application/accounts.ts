import type { AccountClassification } from "../domain/ledger";
import {
  AccountsRepository,
  type AccountRecord,
} from "../db/repositories/accounts";
import { GoalsRepository } from "../db/repositories/goals";
import {
  applicationError,
  type AccountSummary,
  type ApplicationDependencies,
} from "./ports";

export interface CreateAccountInput {
  name: string;
  classification: AccountClassification;
  subtype: string;
  currencyCode: string;
}

export interface ArchiveAccountInput {
  id: string;
}

export interface ActivateCurrencyInput {
  currencyCode: string;
}

const USER_ACCOUNT_CLASSIFICATIONS = new Set<AccountClassification>([
  "asset",
  "liability",
  "receivable",
]);

function normalizeRequiredText(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    applicationError("account_not_found");
  }

  return normalized;
}

function toAccountSummary(account: AccountRecord): AccountSummary {
  return {
    id: account.id,
    name: account.name,
    classification: account.classification,
    subtype: account.subtype,
    currencyCode: account.currencyCode,
    minorUnit: account.minorUnit,
    isSystem: account.isSystem,
    isActive: account.isActive,
    archivedAt: account.archivedAt,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

export async function createAccount(
  deps: ApplicationDependencies,
  input: CreateAccountInput,
): Promise<AccountSummary> {
  if (!USER_ACCOUNT_CLASSIFICATIONS.has(input.classification)) {
    applicationError("account_classification_unsupported");
  }

  return deps.unitOfWork.run(async (tx) => {
    const repository = new AccountsRepository(tx);
    const now = deps.clock.now();
    const currency = await repository.activateCurrency(
      input.currencyCode,
      now,
    );
    const account = await repository.create({
      id: deps.ids.nextId("account"),
      name: normalizeRequiredText(input.name),
      classification: input.classification as
        | "asset"
        | "liability"
        | "receivable",
      subtype: normalizeRequiredText(input.subtype),
      currencyCode: currency.code,
      minorUnit: currency.minorUnit,
      now,
    });

    return toAccountSummary(account);
  });
}

export async function archiveAccount(
  deps: ApplicationDependencies,
  input: ArchiveAccountInput,
): Promise<AccountSummary> {
  return deps.unitOfWork.run(async (tx) => {
    const repository = new AccountsRepository(tx);
    const account = (await repository.lockByIds([input.id]))[0];
    if (!account) applicationError("account_not_found");
    if (account.isSystem) applicationError("account_system_archive_forbidden");
    if (await new GoalsRepository(tx).hasActiveForAccount(account.id)) {
      applicationError("account_has_active_goals");
    }
    const archived = await repository.archive(input.id, deps.clock.now());

    return toAccountSummary(archived);
  });
}

export async function activateCurrency(
  deps: ApplicationDependencies,
  input: ActivateCurrencyInput,
) {
  return deps.unitOfWork.run((tx) =>
    new AccountsRepository(tx).activateCurrency(
      input.currencyCode,
      deps.clock.now(),
    ));
}
