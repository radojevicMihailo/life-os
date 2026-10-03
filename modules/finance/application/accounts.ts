import type { AccountClassification } from "../domain/ledger";
import {
  AccountsRepository,
  type AccountRecord,
} from "../db/repositories/accounts";
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

export interface UpdateAccountInput extends CreateAccountInput {
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
    const archived = await repository.archive(input.id, deps.clock.now());

    return toAccountSummary(archived);
  });
}

export async function updateAccount(
  deps: ApplicationDependencies,
  input: UpdateAccountInput,
): Promise<AccountSummary> {
  if (!USER_ACCOUNT_CLASSIFICATIONS.has(input.classification)) {
    applicationError("account_classification_unsupported");
  }
  return deps.unitOfWork.run(async (tx) => {
    const repository = new AccountsRepository(tx);
    const account = (await repository.lockByIds([input.id]))[0];
    if (!account) applicationError("account_not_found");
    if (account.isSystem) applicationError("account_system_edit_forbidden");
    const name = normalizeRequiredText(input.name);
    const subtype = normalizeRequiredText(input.subtype);
    const detailsChanged = account.classification !== input.classification || account.currencyCode !== input.currencyCode;
    if (detailsChanged && await repository.hasLinkedRecords(input.id)) {
      applicationError("account_details_in_use");
    }
    if (account.isActive && name !== account.name && await repository.activeNameExists(name, input.id)) {
      applicationError("account_name_taken");
    }
    if (account.currencyCode !== input.currencyCode) {
      await repository.activateCurrency(input.currencyCode, deps.clock.now());
    }
    return toAccountSummary(await repository.update({
      id: input.id, name, classification: input.classification as "asset" | "liability" | "receivable",
      subtype, currencyCode: input.currencyCode, now: deps.clock.now(),
    }));
  });
}

export async function restoreAccount(
  deps: ApplicationDependencies,
  input: ArchiveAccountInput,
): Promise<AccountSummary> {
  return deps.unitOfWork.run(async (tx) => {
    const repository = new AccountsRepository(tx);
    const account = (await repository.lockByIds([input.id]))[0];
    if (!account) applicationError("account_not_found");
    if (account.isSystem) applicationError("account_system_edit_forbidden");
    if (account.isActive) return toAccountSummary(account);
    if (await repository.activeNameExists(account.name, account.id)) applicationError("account_name_taken");
    return toAccountSummary(await repository.restore(account.id, deps.clock.now()));
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
