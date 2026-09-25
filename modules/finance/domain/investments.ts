import Decimal from "decimal.js";

import { DomainError } from "./errors";
import { Quantity } from "./money";

const ExactDecimal = Decimal.clone({
  precision: 80,
  rounding: Decimal.ROUND_HALF_UP,
});

const DECIMAL_PATTERN = /^\d+(?:\.\d+)?$/;
const MONEY_SCALE = 18;

export type ActiveInvestmentClass = "stock" | "etf" | "crypto";

export interface InvestmentLot {
  id: string;
  acquiredAt: Date;
  quantity: string;
  remainingQuantity: string;
  costAmount: string;
  feeAmount: string;
  disposedCostBasisAmount?: string;
}

export interface FifoDisposal {
  lotId: string;
  quantity: string;
  proceedsAmount: string;
  costBasisAmount: string;
}

export interface DisposeFifoInput {
  assetClass?: ActiveInvestmentClass;
  quantity: string;
  grossProceeds: string;
  saleFee: string;
}

export interface DisposeFifoResult {
  disposals: FifoDisposal[];
  remainingLots: InvestmentLot[];
  netProceeds: string;
  costBasis: string;
  realizedReturn: string;
}

function canonical(decimal: Decimal): string {
  const fixed = decimal.toFixed(MONEY_SCALE);
  return fixed.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function unsignedDecimal(value: string, options?: { allowZero?: boolean }) {
  if (value.trim() !== value || !DECIMAL_PATTERN.test(value)) {
    throw new DomainError("money_invalid_decimal");
  }

  const decimal = new ExactDecimal(value);

  if ((decimal.decimalPlaces() ?? 0) > MONEY_SCALE) {
    throw new DomainError("money_precision_exceeded");
  }

  if (decimal.isNegative() || (!options?.allowZero && decimal.isZero())) {
    throw new DomainError("money_non_positive");
  }

  return decimal;
}

function quantity(value: string, assetClass: ActiveInvestmentClass) {
  switch (assetClass) {
    case "stock":
      return new ExactDecimal(Quantity.stock(value).amount);
    case "etf":
      return new ExactDecimal(Quantity.etf(value).amount);
    case "crypto":
      return new ExactDecimal(Quantity.crypto(value).amount);
  }
}

function remainingQuantity(value: string, assetClass: ActiveInvestmentClass) {
  if (value === "0") {
    return new ExactDecimal(0);
  }

  return quantity(value, assetClass);
}

function compareLots(left: InvestmentLot, right: InvestmentLot) {
  const timeOrder = left.acquiredAt.getTime() - right.acquiredAt.getTime();
  return timeOrder || left.id.localeCompare(right.id);
}

export function disposeFifo(
  lots: InvestmentLot[],
  input: DisposeFifoInput,
): DisposeFifoResult {
  const assetClass = input.assetClass ?? "stock";

  if (!(["stock", "etf", "crypto"] as const).includes(assetClass)) {
    throw new DomainError("investment_asset_class_unsupported");
  }

  const requested = quantity(input.quantity, assetClass);
  const grossProceeds = unsignedDecimal(input.grossProceeds);
  const saleFee = unsignedDecimal(input.saleFee, { allowZero: true });

  if (saleFee.gte(grossProceeds)) {
    throw new DomainError("investment_fee_exceeds_amount");
  }

  const orderedLots = lots.toSorted(compareLots).map((lot) => {
    const original = quantity(lot.quantity, assetClass);
    const remaining = remainingQuantity(lot.remainingQuantity, assetClass);

    if (remaining.gt(original)) {
      throw new DomainError("quantity_invalid_decimal");
    }

    return {
      lot,
      original,
      remaining,
      grossCost: unsignedDecimal(lot.costAmount, { allowZero: true }),
      acquisitionFee: unsignedDecimal(lot.feeAmount, { allowZero: true }),
      disposedBasis: unsignedDecimal(lot.disposedCostBasisAmount ?? "0", {
        allowZero: true,
      }),
    };
  });
  const available = orderedLots.reduce(
    (sum, lot) => sum.plus(lot.remaining),
    new ExactDecimal(0),
  );

  if (requested.gt(available)) {
    throw new DomainError("investment_quantity_insufficient");
  }

  const netProceedsDecimal = grossProceeds.minus(saleFee);
  const disposals: FifoDisposal[] = [];
  let quantityLeft = requested;
  let allocatedProceeds = new ExactDecimal(0);
  let allocatedBasis = new ExactDecimal(0);

  for (const entry of orderedLots) {
    if (quantityLeft.isZero() || entry.remaining.isZero()) {
      continue;
    }

    const taken = ExactDecimal.min(quantityLeft, entry.remaining);
    const isFinalDisposal = taken.eq(quantityLeft);
    const closesLot = taken.eq(entry.remaining);
    const totalBasis = entry.grossCost.plus(entry.acquisitionFee);
    const costBasis = closesLot
      ? totalBasis.minus(entry.disposedBasis)
      : totalBasis.times(taken).div(entry.original).toDecimalPlaces(MONEY_SCALE);
    const proceeds = isFinalDisposal
      ? netProceedsDecimal.minus(allocatedProceeds)
      : netProceedsDecimal
          .times(taken)
          .div(requested)
          .toDecimalPlaces(MONEY_SCALE);

    disposals.push({
      lotId: entry.lot.id,
      quantity: canonical(taken),
      proceedsAmount: canonical(proceeds),
      costBasisAmount: canonical(costBasis),
    });
    allocatedProceeds = allocatedProceeds.plus(proceeds);
    allocatedBasis = allocatedBasis.plus(costBasis);
    quantityLeft = quantityLeft.minus(taken);
    entry.remaining = entry.remaining.minus(taken);
  }

  return {
    disposals,
    remainingLots: orderedLots.map((entry) => ({
      ...entry.lot,
      remainingQuantity: canonical(entry.remaining),
    })),
    netProceeds: canonical(netProceedsDecimal),
    costBasis: canonical(allocatedBasis),
    realizedReturn: canonical(netProceedsDecimal.minus(allocatedBasis)),
  };
}
