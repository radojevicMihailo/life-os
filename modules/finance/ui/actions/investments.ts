"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { AlphaVantageClient } from "../../adapters/alpha-vantage/client";
import { CoinGeckoClient } from "../../adapters/coingecko/client";
import { buyInvestment, createInvestmentAccount, recordDividend, recordInvestmentFee, recordOpeningLot, resolveInstrument, sellInvestment } from "../../application/investments";
import { env } from "../../config/env";
import { pool } from "@/db/pool";
import { reserveAlphaVantageRequest } from "../../db/alpha-vantage-budget";
import type { ActionResult } from "../forms/action-result";
import { parseInstrumentResolutionForm, parseInvestmentAccountForm, parseInvestmentActivityForm, parseOpeningLotForm } from "../forms/investment";
import { executeAction } from "./result";
import { mutationDependencies } from "./runtime";
import { parseField } from "../forms/common";
import { correctInvestmentTransaction } from "../../application/investment-corrections";
import { parseInvestmentCorrectionForm } from "../forms/investment";

export async function correctInvestmentTransactionAction(_previous: ActionResult<{ id: string }> | undefined, formData: FormData) {
  return executeAction(() => correctInvestmentTransaction(mutationDependencies(), parseInvestmentCorrectionForm(formData)), {
    financial: true, revalidate: ["/finance/investments", "/finance", "/finance/accounts", "/finance/transactions", "/finance/budgets", "/finance/goals"],
  });
}

export async function setOpeningSetupVisibilityAction(_previous: ActionResult<{ hidden: boolean }> | undefined, formData: FormData) {
  return executeAction(async () => {
    const hidden = parseField("hidden", z.enum(["true", "false"]), formData.get("hidden")) === "true";
    (await cookies()).set("finance-opening-setup-hidden", hidden ? "1" : "0", {
      path: "/finance", maxAge: 365 * 24 * 60 * 60,
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    });
    return { hidden };
  }, { revalidate: ["/finance/investments"] });
}

function providerFor(name: "alpha_vantage" | "coingecko") {
  const common = { clock: { now: () => new Date() }, fetch };
  if (name === "alpha_vantage") {
    if (!env.ALPHA_VANTAGE_API_KEY) throw new Error("alpha_vantage_api_key_required");
    return new AlphaVantageClient({
      ...common,
      get signal() { return AbortSignal.timeout(env.PROVIDER_TIMEOUT_MS); },
      apiKey: env.ALPHA_VANTAGE_API_KEY,
      reserveRequest: () => reserveAlphaVantageRequest(pool),
      ...(env.ALPHA_VANTAGE_API_URL ? { apiUrl: env.ALPHA_VANTAGE_API_URL } : {}),
    });
  }
  if (!env.COINGECKO_API_KEY) throw new Error("coingecko_api_key_required");
  return new CoinGeckoClient({ ...common, get signal() { return AbortSignal.timeout(env.PROVIDER_TIMEOUT_MS); }, apiKey: env.COINGECKO_API_KEY });
}

export async function createInvestmentAccountAction(_previous: ActionResult<{ id: string }> | undefined, formData: FormData) {
  return executeAction(async () => {
    const result = await createInvestmentAccount(mutationDependencies(), parseInvestmentAccountForm(formData));
    return { id: result.id };
  }, { revalidate: ["/finance/investments"] });
}

export async function createOpeningLotAction(_previous: ActionResult<{ id: string } | { skipped: true }> | undefined, formData: FormData) {
  return executeAction(async () => {
    const parsed = parseOpeningLotForm(formData);
    if (!parsed) return { skipped: true as const };
    const result = await recordOpeningLot(mutationDependencies(), parsed);
    return { id: result.id };
  }, { financial: true, revalidate: ["/finance/investments", "/finance"] });
}

export async function saveInvestmentActivityAction(_previous: ActionResult<{ id: string }> | undefined, formData: FormData) {
  return executeAction(async () => {
    const parsed = parseInvestmentActivityForm(formData);
    const common = {
      investmentAccountId: parsed.investmentAccountId,
      instrumentId: parsed.instrumentId,
      tradeCurrencyCode: parsed.tradeCurrencyCode,
      tradeFxRateToEur: parsed.tradeFxRateToEur,
      ...(parsed.occurredAt ? { occurredAt: parsed.occurredAt } : {}),
      ...(parsed.description ? { description: parsed.description } : {}),
    };
    const result = parsed.operation === "buy"
      ? await buyInvestment(mutationDependencies(), { ...common, quantity: parsed.quantity!, grossAmount: parsed.amount, feeAmount: parsed.fees })
      : parsed.operation === "sell"
        ? await sellInvestment(mutationDependencies(), { ...common, quantity: parsed.quantity!, grossAmount: parsed.amount, feeAmount: parsed.fees })
        : parsed.operation === "dividend"
          ? await recordDividend(mutationDependencies(), { ...common, grossAmount: parsed.amount })
          : await recordInvestmentFee(mutationDependencies(), { ...common, feeAmount: parsed.amount });
    return { id: result.id };
  }, { financial: true, revalidate: ["/finance/investments", "/finance", "/finance/accounts", "/finance/budgets"] });
}

export async function resolveInstrumentAction(_previous: ActionResult<{ id: string }> | undefined, formData: FormData) {
  return executeAction(async () => {
    const parsed = parseInstrumentResolutionForm(formData);
    const result = await resolveInstrument(mutationDependencies(), parsed, providerFor(parsed.provider));
    return { id: result.id };
  }, { revalidate: ["/finance/investments", "/finance/settings"] });
}
