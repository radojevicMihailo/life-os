import Decimal from "decimal.js";
import { z } from "zod";

import type { TransactionSummary } from "./ports";
import type { ApplicationDependencies } from "./ports";
import { executeIdempotently, type JsonValue } from "./idempotency";
import {
  recordTransaction,
  type RecordTransactionInput,
} from "./transactions";

const identifier = z.string().trim().min(1).max(200);
const optionalNote = z.string().trim().min(1).max(500).optional();
const counterparty = z.string().trim().min(1).max(200);
const occurredAt = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value).toISOString());

const normalizedDecimal = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d+)?$/)
  .refine((value) => new Decimal(value).isPositive())
  .transform((value) => {
    const decimal = new Decimal(value);
    return decimal.toFixed(decimal.decimalPlaces());
  });

const commonShape = {
  occurredAt: occurredAt.optional(),
  note: optionalNote,
};

const expenseRequestSchema = z.strictObject({
  operation: z.literal("expense"),
  accountId: identifier,
  categoryId: identifier,
  amount: normalizedDecimal,
  ...commonShape,
});

const incomeRequestSchema = z.strictObject({
  operation: z.literal("income"),
  accountId: identifier,
  categoryId: identifier,
  amount: normalizedDecimal,
  ...commonShape,
});

const transferRequestSchema = z
  .strictObject({
    operation: z.literal("transfer"),
    fromAccountId: identifier,
    toAccountId: identifier,
    amount: normalizedDecimal.optional(),
    fromAmount: normalizedDecimal.optional(),
    toAmount: normalizedDecimal.optional(),
    effectiveRate: normalizedDecimal.optional(),
    fee: z
      .strictObject({
        amount: normalizedDecimal,
        categoryId: identifier,
      })
      .optional(),
    ...commonShape,
  })
  .superRefine((request, context) => {
    const hasFxField = Boolean(
      request.fromAmount || request.toAmount || request.effectiveRate,
    );

    if (request.amount && hasFxField) {
      context.addIssue({
        code: "custom",
        message: "transfer_amount_conflict",
      });
      return;
    }

    if (!request.amount) {
      if (!request.fromAmount) {
        context.addIssue({ code: "custom", message: "from_amount_required" });
      }

      if (Boolean(request.toAmount) === Boolean(request.effectiveRate)) {
        context.addIssue({
          code: "custom",
          message: "to_amount_or_rate_required",
        });
      }
    }
  });

const receivableOutRequestSchema = z.strictObject({
  operation: z.literal("receivable_out"),
  fromAccountId: identifier,
  receivableAccountId: identifier,
  amount: normalizedDecimal,
  counterparty,
  ...commonShape,
});

const receivableRepaymentRequestSchema = z.strictObject({
  operation: z.literal("receivable_repayment"),
  receivableAccountId: identifier,
  toAccountId: identifier,
  amount: normalizedDecimal,
  counterparty,
  ...commonShape,
});

export const shortcutRequestSchema = z.discriminatedUnion("operation", [
  expenseRequestSchema,
  incomeRequestSchema,
  transferRequestSchema,
  receivableOutRequestSchema,
  receivableRepaymentRequestSchema,
]);

export type ShortcutRequest = z.infer<typeof shortcutRequestSchema>;

export function parseShortcutRequest(input: unknown): ShortcutRequest {
  return shortcutRequestSchema.parse(input);
}

export interface ExecuteShortcutTransactionInput {
  idempotencyKey: string;
  request: ShortcutRequest;
}

export interface ShortcutSuccessResponse {
  affectedBalances: TransactionSummary["affectedBalances"];
  reportingConversionStale: boolean;
  transaction: Omit<TransactionSummary, "occurredAt"> & { occurredAt: string };
  transactionId: string;
}

function commonTransactionFields(request: ShortcutRequest) {
  return {
    ...(request.occurredAt
      ? { occurredAt: new Date(request.occurredAt) }
      : {}),
    ...(request.note ? { description: request.note } : {}),
    source: "shortcut" as const,
  };
}

function toRecordTransactionInput(
  request: ShortcutRequest,
): RecordTransactionInput {
  const common = commonTransactionFields(request);

  switch (request.operation) {
    case "expense":
    case "income":
      return {
        ...common,
        accountId: request.accountId,
        amount: request.amount,
        categoryId: request.categoryId,
        type: request.operation,
      };
    case "transfer":
      return {
        ...common,
        fromAccountId: request.fromAccountId,
        toAccountId: request.toAccountId,
        ...(request.amount ? { amount: request.amount } : {}),
        ...(request.fromAmount ? { fromAmount: request.fromAmount } : {}),
        ...(request.toAmount ? { toAmount: request.toAmount } : {}),
        ...(request.effectiveRate
          ? { effectiveRate: request.effectiveRate }
          : {}),
        ...(request.fee ? { fee: request.fee } : {}),
        type: "transfer",
      };
    case "receivable_out":
      return {
        ...common,
        amount: request.amount,
        counterparty: request.counterparty,
        fromAccountId: request.fromAccountId,
        receivableAccountId: request.receivableAccountId,
        type: "receivable_out",
      };
    case "receivable_repayment":
      return {
        ...common,
        amount: request.amount,
        counterparty: request.counterparty,
        receivableAccountId: request.receivableAccountId,
        toAccountId: request.toAccountId,
        type: "receivable_repayment",
      };
  }
}

function successResponse(summary: TransactionSummary): ShortcutSuccessResponse {
  return {
    affectedBalances: summary.affectedBalances,
    reportingConversionStale: summary.affectedBalances.some(
      (balance) => balance.currencyCode !== "EUR",
    ),
    transaction: {
      ...summary,
      occurredAt: summary.occurredAt.toISOString(),
    },
    transactionId: summary.id,
  };
}

export async function executeShortcutTransaction(
  deps: ApplicationDependencies,
  input: ExecuteShortcutTransactionInput,
) {
  return executeIdempotently(deps, {
    scope: "shortcut:transactions",
    key: input.idempotencyKey,
    request: input.request as JsonValue,
    work: async (transactionalDependencies) => {
      const summary = await recordTransaction(
        transactionalDependencies,
        toRecordTransactionInput(input.request),
      );

      return {
        response: successResponse(summary),
        resultTransactionId: summary.id,
      };
    },
  });
}
