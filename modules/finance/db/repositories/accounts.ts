import { asc, eq, inArray } from "drizzle-orm";

import type { AccountClassification } from "../../domain/ledger";
import { applicationError, type AccountSummary } from "../../application/ports";
import type { DbTx } from "../client";
import { accounts, currencies } from "../schema";

export interface AccountRecord extends AccountSummary {
  classification: AccountClassification;
}

export type SystemAccountSubtype =
  | "expense"
  | "fees"
  | "foreign_exchange"
  | "income"
  | "investment"
  | "opening_balance";

export interface SystemAccountRequest<Role extends string = string> {
  role: Role;
  classification: AccountClassification;
  currencyCode: string;
  minorUnit?: number;
  subtype: SystemAccountSubtype;
  now: Date;
}

export interface OrderedSystemAccountRequest<Role extends string = string>
  extends SystemAccountRequest<Role> {
  id: string;
  name: string;
  currencyCode: string;
}

function normalizeCurrencyCode(currencyCode: string) {
  const normalized = currencyCode.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(normalized)) {
    applicationError("currency_invalid");
  }

  return normalized;
}

function accountIdForSystem(subtype: SystemAccountSubtype, currencyCode: string) {
  return `system-${subtype.replaceAll("_", "-")}-${currencyCode.toLowerCase()}`;
}

function accountNameForSystem(subtype: SystemAccountSubtype, currencyCode: string) {
  const label = subtype.replaceAll("_", " ");
  return `System ${label} ${currencyCode}`;
}

function seededSystemAccountId(
  subtype: SystemAccountSubtype,
  currencyCode: string,
) {
  if (currencyCode !== "EUR") {
    return undefined;
  }

  switch (subtype) {
    case "expense":
      return "system-expense";
    case "fees":
      return "system-fees";
    case "foreign_exchange":
      return "system-fx";
    case "income":
      return "system-income";
    case "investment":
      return undefined;
    case "opening_balance":
      return "system-equity";
  }
}

function systemAccountId(subtype: SystemAccountSubtype, currencyCode: string) {
  return (
    seededSystemAccountId(subtype, currencyCode) ??
    accountIdForSystem(subtype, currencyCode)
  );
}

function parseCatalogMinorUnit(minorUnit: string): number {
  if (!/^\d+$/.test(minorUnit)) {
    applicationError("currency_minor_unit_invalid");
  }

  const parsed = Number(minorUnit);

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 18) {
    applicationError("currency_minor_unit_invalid");
  }

  return parsed;
}

function toAccountRecord(
  account: typeof accounts.$inferSelect,
  minorUnit: string,
): AccountRecord {
  return {
    ...account,
    minorUnit: parseCatalogMinorUnit(minorUnit),
  } as AccountRecord;
}

export function orderSystemAccountRequests<Role extends string>(
  requests: Array<SystemAccountRequest<Role>>,
): Array<OrderedSystemAccountRequest<Role>> {
  return requests
    .map((request) => {
      const currencyCode = normalizeCurrencyCode(request.currencyCode);

      return {
        ...request,
        currencyCode,
        id: systemAccountId(request.subtype, currencyCode),
        name: accountNameForSystem(request.subtype, currencyCode),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

export class AccountsRepository {
  constructor(private readonly tx: DbTx) {}

  async activateCurrency(currencyCode: string, activatedAt: Date) {
    const code = normalizeCurrencyCode(currencyCode);
    const [currency] = await this.tx
      .select({
        code: currencies.code,
        isActive: currencies.isActive,
        minorUnit: currencies.minorUnit,
      })
      .from(currencies)
      .where(eq(currencies.code, code))
      .for("update");

    if (!currency) {
      applicationError("currency_not_found");
    }

    if (!currency.isActive) {
      await this.tx
        .update(currencies)
        .set({
          activatedAt,
          isActive: true,
        })
        .where(eq(currencies.code, code));
    }

    return {
      code,
      minorUnit: parseCatalogMinorUnit(currency.minorUnit),
    };
  }

  async create(input: {
    id: string;
    name: string;
    classification: "asset" | "liability" | "receivable";
    subtype: string;
    currencyCode: string;
    minorUnit: number;
    now: Date;
  }): Promise<AccountRecord> {
    const [account] = await this.tx
      .insert(accounts)
      .values({
        id: input.id,
        name: input.name,
        classification: input.classification,
        subtype: input.subtype,
        currencyCode: input.currencyCode,
        isSystem: false,
        isActive: true,
        archivedAt: null,
        createdAt: input.now,
        updatedAt: input.now,
      })
      .returning();

    if (!account) {
      applicationError("account_not_found");
    }

    return {
      ...account,
      minorUnit: input.minorUnit,
    } as AccountRecord;
  }

  async archive(id: string, archivedAt: Date): Promise<AccountRecord> {
    const [account] = await this.tx
      .update(accounts)
      .set({
        archivedAt,
        isActive: false,
        updatedAt: archivedAt,
      })
      .where(eq(accounts.id, id))
      .returning();

    if (!account) {
      applicationError("account_not_found");
    }

    const [currency] = await this.tx
      .select({ minorUnit: currencies.minorUnit })
      .from(currencies)
      .where(eq(currencies.code, account.currencyCode));

    if (!currency) {
      applicationError("currency_not_found");
    }

    return toAccountRecord(account, currency.minorUnit);
  }

  async lockByIds(ids: string[]): Promise<AccountRecord[]> {
    const uniqueIds = [...new Set(ids)].sort();

    if (uniqueIds.length === 0) {
      return [];
    }

    const rows = await this.tx
      .select({
        account: accounts,
        minorUnit: currencies.minorUnit,
      })
      .from(accounts)
      .innerJoin(currencies, eq(currencies.code, accounts.currencyCode))
      .where(inArray(accounts.id, uniqueIds))
      .orderBy(asc(accounts.id))
      .for("update");

    return rows.map((row) => toAccountRecord(row.account, row.minorUnit));
  }

  async getOrCreateSystemAccounts<Role extends string>(
    requests: Array<SystemAccountRequest<Role>>,
  ): Promise<Map<Role, AccountRecord>> {
    const ordered = orderSystemAccountRequests(requests);

    if (ordered.length === 0) {
      return new Map();
    }

    const ids = ordered.map((request) => request.id);
    const existingRows = await this.tx
      .select({
        account: accounts,
        minorUnit: currencies.minorUnit,
      })
      .from(accounts)
      .innerJoin(currencies, eq(currencies.code, accounts.currencyCode))
      .where(inArray(accounts.id, ids))
      .orderBy(asc(accounts.id))
      .for("update");
    const existingById = new Map(
      existingRows.map((row) => [
        row.account.id,
        toAccountRecord(row.account, row.minorUnit),
      ]),
    );
    const recordsByRole = new Map<Role, AccountRecord>();

    for (const request of ordered) {
      const existing = existingById.get(request.id);

      if (existing) {
        recordsByRole.set(request.role, existing);
        continue;
      }

      const [created] = await this.tx
        .insert(accounts)
        .values({
          id: request.id,
          name: request.name,
          classification: request.classification,
          subtype: request.subtype,
          currencyCode: request.currencyCode,
          isSystem: true,
          isActive: true,
          archivedAt: null,
          createdAt: request.now,
          updatedAt: request.now,
        })
        .onConflictDoNothing()
        .returning();

      if (created) {
        let minorUnit = request.minorUnit;

        if (minorUnit === undefined) {
          const [currency] = await this.tx
            .select({ minorUnit: currencies.minorUnit })
            .from(currencies)
            .where(eq(currencies.code, request.currencyCode));

          if (!currency) {
            applicationError("currency_not_found");
          }

          minorUnit = parseCatalogMinorUnit(currency.minorUnit);
        }

        recordsByRole.set(request.role, {
          ...created,
          minorUnit,
        } as AccountRecord);
        continue;
      }

      const [account] = await this.tx
        .select({
          account: accounts,
          minorUnit: currencies.minorUnit,
        })
        .from(accounts)
        .innerJoin(currencies, eq(currencies.code, accounts.currencyCode))
        .where(eq(accounts.id, request.id))
        .for("update");

      if (!account) {
        applicationError("account_not_found");
      }

      recordsByRole.set(
        request.role,
        toAccountRecord(account.account, account.minorUnit),
      );
    }

    return recordsByRole;
  }

  async getOrCreateSystemAccount(
    input: Omit<SystemAccountRequest<"account">, "role">,
  ): Promise<AccountRecord> {
    const accountsByRole = await this.getOrCreateSystemAccounts([
      {
        ...input,
        role: "account",
      },
    ]);

    return accountsByRole.get("account") ?? applicationError("account_not_found");
  }
}
