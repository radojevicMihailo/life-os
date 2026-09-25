import { z } from "zod";

import type { RecordTransactionInput } from "../../application/transactions";
import {
  belgradeDateTime,
  formRecord,
  formValidationError,
  identifier,
  normalizeSerbianDecimalField,
  optionalText,
  parseField,
} from "./common";

const operation = z.enum([
  "income",
  "expense",
  "transfer",
  "opening_balance",
  "credit_card_purchase",
  "credit_card_repayment",
  "receivable_out",
  "receivable_repayment",
]);

const transactionFormSchema = z.object({
  operation,
  accountId: z.unknown().optional(),
  categoryId: z.unknown().optional(),
  fromAccountId: z.unknown().optional(),
  toAccountId: z.unknown().optional(),
  receivableAccountId: z.unknown().optional(),
  amount: z.unknown().optional(),
  fromAmount: z.unknown().optional(),
  toAmount: z.unknown().optional(),
  effectiveRate: z.unknown().optional(),
  feeAmount: z.unknown().optional(),
  feeCategoryId: z.unknown().optional(),
  counterparty: z.unknown().optional(),
  occurredAt: belgradeDateTime().optional(),
  description: z.unknown().optional(),
}).superRefine((raw, context) => {
  const issue = (field: keyof typeof raw, message: string) => context.addIssue({ code: "custom", message, path: [field] });
  const required = (field: keyof typeof raw, message: string) => {
    if (!optionalText(raw[field])) issue(field, message);
  };
  if (["income", "expense", "credit_card_purchase"].includes(raw.operation)) required("categoryId", "Izaberite kategoriju.");
  if (["income", "expense", "opening_balance", "credit_card_purchase"].includes(raw.operation)) required("accountId", "Izaberite račun.");
  if (raw.operation !== "transfer") required("amount", "Unesite iznos.");
  if (["transfer", "credit_card_repayment", "receivable_out"].includes(raw.operation)) required("fromAccountId", "Izaberite račun sa kog se plaća.");
  if (["transfer", "credit_card_repayment", "receivable_repayment"].includes(raw.operation)) required("toAccountId", "Izaberite odredišni račun.");
  if (["receivable_out", "receivable_repayment"].includes(raw.operation)) {
    required("receivableAccountId", "Izaberite račun potraživanja.");
    required("counterparty", "Unesite drugu stranu.");
  }
  if (raw.operation === "transfer") {
    const amount = optionalText(raw.amount);
    const fromAmount = optionalText(raw.fromAmount);
    const toAmount = optionalText(raw.toAmount);
    const effectiveRate = optionalText(raw.effectiveRate);
    if (amount && (fromAmount || toAmount || effectiveRate)) {
      issue("amount", "Koristite ili isti-valutni iznos ili devizna polja.");
      if (fromAmount) issue("fromAmount", "Devizni iznos nije dozvoljen uz isti-valutni iznos.");
    } else if (!amount) {
      if (!fromAmount) issue("fromAmount", "Unesite izvorni iznos.");
      if (Boolean(toAmount) === Boolean(effectiveRate)) {
        issue("toAmount", "Unesite tačno jedan od odredišnog iznosa ili efektivnog kursa.");
        issue("effectiveRate", "Unesite tačno jedan od odredišnog iznosa ili efektivnog kursa.");
      }
    }
  }
});

export function parseTransactionForm(
  input: FormData | Record<string, unknown>,
): RecordTransactionInput {
  const raw = transactionFormSchema.parse(formRecord(input));
  const selected = raw.operation;
  const common = {
    ...(raw.occurredAt ? { occurredAt: raw.occurredAt } : {}),
    ...(optionalText(raw.description) ? { description: optionalText(raw.description) } : {}),
    source: "web" as const,
  };
  const amount = () => normalizeSerbianDecimalField("amount", raw.amount);
  const id = (field: keyof typeof raw) => parseField(field, identifier, raw[field]);

  switch (selected) {
    case "income":
    case "expense":
    case "credit_card_purchase":
      return {
        ...common,
        type: selected === "credit_card_purchase" ? "expense" : selected,
        accountId: id("accountId"),
        categoryId: id("categoryId"),
        amount: amount(),
      };
    case "opening_balance":
      return { ...common, type: selected, accountId: id("accountId"), amount: amount() };
    case "credit_card_repayment":
      return {
        ...common,
        type: "transfer",
        fromAccountId: id("fromAccountId"),
        toAccountId: id("toAccountId"),
        amount: amount(),
      };
    case "receivable_out":
      return {
        ...common,
        type: selected,
        fromAccountId: id("fromAccountId"),
        receivableAccountId: id("receivableAccountId"),
        amount: amount(),
        counterparty: parseField("counterparty", z.string().trim().min(1).max(200), raw.counterparty),
      };
    case "receivable_repayment":
      return {
        ...common,
        type: selected,
        receivableAccountId: id("receivableAccountId"),
        toAccountId: id("toAccountId"),
        amount: amount(),
        counterparty: parseField("counterparty", z.string().trim().min(1).max(200), raw.counterparty),
      };
    case "transfer": {
      const sameCurrencyAmount = optionalText(raw.amount);
      const fromAmount = optionalText(raw.fromAmount);
      const toAmount = optionalText(raw.toAmount);
      const effectiveRate = optionalText(raw.effectiveRate);
      if (sameCurrencyAmount && (fromAmount || toAmount || effectiveRate)) {
        formValidationError({ amount: "Koristite ili isti-valutni iznos ili devizna polja." });
      }
      if (!sameCurrencyAmount && (!fromAmount || Boolean(toAmount) === Boolean(effectiveRate))) {
        formValidationError({ toAmount: "Unesite tačno jedan od odredišnog iznosa ili efektivnog kursa." });
      }
      return {
        ...common,
        type: selected,
        fromAccountId: id("fromAccountId"),
        toAccountId: id("toAccountId"),
        ...(sameCurrencyAmount ? { amount: normalizeSerbianDecimalField("amount", sameCurrencyAmount) } : {}),
        ...(fromAmount ? { fromAmount: normalizeSerbianDecimalField("fromAmount", fromAmount) } : {}),
        ...(toAmount ? { toAmount: normalizeSerbianDecimalField("toAmount", toAmount) } : {}),
        ...(effectiveRate ? { effectiveRate: normalizeSerbianDecimalField("effectiveRate", effectiveRate) } : {}),
        ...(optionalText(raw.feeAmount) && optionalText(raw.feeCategoryId)
          ? {
              fee: {
                amount: normalizeSerbianDecimalField("feeAmount", raw.feeAmount),
                categoryId: parseField("feeCategoryId", identifier, raw.feeCategoryId),
              },
            }
          : {}),
      };
    }
  }
}

export function parseCorrectionForm(input: FormData | Record<string, unknown>) {
  const raw = formRecord(input);
  return {
    originalId: parseField("originalId", identifier, raw.originalId),
    replacement: parseTransactionForm({
      ...raw,
      amount: raw.correctedAmount ?? raw.amount,
      description: raw.replacementDescription,
    }),
    source: "web" as const,
    ...(optionalText(raw.correctionDescription)
      ? { description: optionalText(raw.correctionDescription) }
      : {}),
  };
}
