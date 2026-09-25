import { describe, expect, it } from "vitest";

import { DomainError } from "@/modules/finance/domain/errors";
import {
  assertBalanced,
  reverseJournal,
  toDisplayBalance,
  type JournalDraft,
  type LedgerAccount,
  type PostingDraft,
} from "@/modules/finance/domain/ledger";

function account(
  id: string,
  classification: LedgerAccount["classification"],
  currencyCode: LedgerAccount["currencyCode"] = "EUR",
): LedgerAccount {
  return {
    id,
    classification,
    currencyCode,
  };
}

function posting(
  accountDraft: LedgerAccount,
  amount: string,
  dimensions?: Partial<Pick<PostingDraft, "categoryId" | "counterparty">>,
): PostingDraft {
  return {
    account: accountDraft,
    currencyCode: accountDraft.currencyCode,
    amount,
    ...dimensions,
  };
}

function journal(postings: PostingDraft[]): JournalDraft {
  return {
    id: "journal-1",
    type: "transfer",
    source: "web",
    postings,
  };
}

function expectDomainCode(action: () => unknown, code: string) {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
    expect((error as DomainError).message).toBe(code);
    return;
  }

  throw new Error(`Expected DomainError ${code}`);
}

describe("assertBalanced", () => {
  it("accepts signed posting amounts while Money stays positive-only", () => {
    expect(() =>
      assertBalanced(
        journal([
          posting(account("cash", "asset"), "10.00"),
          posting(account("salary", "income"), "-10.00", {
            categoryId: "salary",
          }),
        ]),
      ),
    ).not.toThrow();
  });

  it("rejects journals with fewer than two postings", () => {
    expectDomainCode(
      () => assertBalanced(journal([posting(account("cash", "asset"), "10.00")])),
      "journal_minimum_postings",
    );
  });

  it("balances each currency independently", () => {
    expect(() =>
      assertBalanced(
        journal([
          posting(account("cash", "asset", "EUR"), "10.00"),
          posting(account("income", "income", "EUR"), "-10.00", {
            categoryId: "salary",
          }),
        ]),
      ),
    ).not.toThrow();

    expectDomainCode(
      () =>
        assertBalanced(
          journal([
            posting(account("cash", "asset", "EUR"), "10.00"),
            posting(account("fx", "equity", "RSD"), "-1170.00"),
          ]),
        ),
      "journal_unbalanced",
    );
  });

  it("requires category dimensions on income and expense postings", () => {
    expectDomainCode(
      () =>
        assertBalanced(
          journal([
            posting(account("cash", "asset"), "10.00"),
            posting(account("groceries", "expense"), "-10.00"),
          ]),
        ),
      "journal_category_required",
    );
  });

  it("requires counterparties on receivable postings", () => {
    expectDomainCode(
      () =>
        assertBalanced(
          journal([
            posting(account("cash", "asset"), "-10.00"),
            posting(account("loan", "receivable"), "10.00"),
          ]),
        ),
      "journal_counterparty_required",
    );
  });

  it("rejects posting currencies that do not match money account currency", () => {
    const eurCash = account("cash", "asset", "EUR");

    expectDomainCode(
      () =>
        assertBalanced({
          ...journal([
            posting(eurCash, "10.00"),
            posting(account("income", "income", "EUR"), "-10.00", {
              categoryId: "salary",
            }),
          ]),
          postings: [
            {
              ...posting(eurCash, "10.00"),
              currencyCode: "USD",
            },
            posting(account("income", "income", "EUR"), "-10.00", {
              categoryId: "salary",
            }),
          ],
        }),
      "journal_posting_currency_mismatch",
    );
  });
});

describe("toDisplayBalance", () => {
  it.each([
    ["asset", "25.00", "25.00"],
    ["receivable", "25.00", "25.00"],
    ["expense", "25.00", "25.00"],
    ["liability", "-25.00", "25.00"],
    ["income", "-25.00", "25.00"],
    ["equity", "-25.00", "25.00"],
  ] as const)(
    "shows account-nature-aware balances for %s accounts",
    (classification, internalAmount, expected) => {
      expect(
        toDisplayBalance(account("acct", classification), internalAmount),
      ).toBe(expected);
    },
  );
});

describe("reverseJournal", () => {
  it("creates an exact reversal with linkage to the original journal", () => {
    const original: JournalDraft = {
      id: "txn-1",
      type: "expense",
      source: "web",
      postings: [
        posting(account("expense", "expense"), "10.00", {
          categoryId: "groceries",
        }),
        posting(account("cash", "asset"), "-10.00"),
      ],
    };

    const reversal = reverseJournal(original, {
      id: "txn-2",
      source: "web",
    });

    expect(reversal.type).toBe("correction");
    expect(reversal.correctionOfId).toBe("txn-1");
    expect(reversal.id).toBe("txn-2");
    expect(reversal.postings).toEqual([
      {
        ...original.postings[0],
        amount: "-10.00",
      },
      {
        ...original.postings[1],
        amount: "10.00",
      },
    ]);
    expect(() => assertBalanced(reversal)).not.toThrow();
  });

  it("rejects reversal requests without an original journal id", () => {
    expectDomainCode(
      () =>
        reverseJournal(
          {
            ...journal([
              posting(account("cash", "asset"), "10.00"),
              posting(account("income", "income"), "-10.00", {
                categoryId: "salary",
              }),
            ]),
            id: undefined,
          },
          { id: "txn-2", source: "web" },
        ),
      "journal_original_id_required",
    );
  });
});
