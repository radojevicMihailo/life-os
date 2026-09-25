import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import {
  parseInvestmentActivityForm,
  parseOpeningLotForm,
} from "@/modules/finance/ui/forms/investment";

describe("investment forms", () => {
  it("keeps all seeded opening-position fields empty until the user supplies them", () => {
    expect(parseOpeningLotForm({
      investmentAccountId: "broker",
      instrumentId: "instrument-btc",
      quantity: "",
      acquiredAt: "",
      price: "",
      currencyCode: "",
      fees: "",
      tradeFxRateToEur: "",
    })).toBeNull();
  });

  it("normalizes a truthful opening lot without inventing a cash amount", () => {
    expect(parseOpeningLotForm({
      investmentAccountId: "broker",
      instrumentId: "instrument-btc",
      quantity: "0,125",
      acquiredAt: "2024-01-10",
      price: "40.000,00",
      currencyCode: "eur",
      fees: "5,50",
      tradeFxRateToEur: "1",
    })).toEqual({
      investmentAccountId: "broker",
      instrumentId: "instrument-btc",
      quantity: "0.125",
      acquiredAt: new Date("2024-01-09T23:00:00.000Z"),
      price: "40000",
      currencyCode: "EUR",
      fees: "5.5",
      tradeFxRateToEur: "1",
    });
  });

  it("requires every opening-lot fact once setup starts, including an explicit zero fee", () => {
    try {
      parseOpeningLotForm({
        investmentAccountId: "broker",
        instrumentId: "instrument-btc",
        quantity: "0,125",
        acquiredAt: "",
        price: "",
        currencyCode: "",
        fees: "",
        tradeFxRateToEur: "",
      });
      expect.unreachable("partial opening lot must fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError);
      expect((error as ZodError).flatten().fieldErrors).toMatchObject({
        acquiredAt: expect.any(Array),
        currencyCode: expect.any(Array),
        fees: expect.any(Array),
        price: expect.any(Array),
        tradeFxRateToEur: expect.any(Array),
      });
    }

    expect(parseOpeningLotForm({
      investmentAccountId: "broker",
      instrumentId: "instrument-btc",
      quantity: "0,125",
      acquiredAt: "2024-01-10",
      price: "40000",
      currencyCode: "EUR",
      fees: "0",
      tradeFxRateToEur: "1",
    })).toMatchObject({ fees: "0" });
  });

  it("dynamically requires quantity and the matching amount for each activity", () => {
    expect(parseInvestmentActivityForm({
      operation: "dividend",
      investmentAccountId: "broker",
      instrumentId: "instrument-btc",
      amount: "10,25",
      tradeFxRateToEur: "1",
    })).toMatchObject({ operation: "dividend", amount: "10.25" });
    expect(() => parseInvestmentActivityForm({
      operation: "sell",
      investmentAccountId: "broker",
      instrumentId: "instrument-btc",
      amount: "10",
      tradeFxRateToEur: "1",
    })).toThrow();
  });

  it("paths activity validation failures to their controls", () => {
    try {
      parseInvestmentActivityForm({
        operation: "sell",
        investmentAccountId: "broker",
        instrumentId: "instrument-btc",
        amount: "bad",
        tradeFxRateToEur: "",
      });
      expect.unreachable("invalid activity must fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError);
      expect((error as ZodError).flatten().fieldErrors).toMatchObject({
        amount: expect.any(Array),
        quantity: expect.any(Array),
        tradeFxRateToEur: expect.any(Array),
      });
    }
  });
});
