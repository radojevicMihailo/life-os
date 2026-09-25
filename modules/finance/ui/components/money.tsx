import Decimal from "decimal.js";

export interface MoneyProps {
  amount: string;
  currencyCode: string;
  label?: string;
  className?: string;
  minorUnit?: number;
}

export function formatMoney(
  amount: string,
  currencyCode: string,
  catalogMinorUnit?: number,
) {
  const currencyFormatter = new Intl.NumberFormat("sr-Latn-RS", {
    currency: currencyCode,
    currencyDisplay: "symbol",
    style: "currency",
  });
  const minorUnit = catalogMinorUnit ??
    currencyFormatter.resolvedOptions().maximumFractionDigits;
  const value = new Decimal(amount);
  const fixed = value.abs().toFixed(minorUnit);
  const [whole = "0", fraction] = fixed.split(".");
  const number = new Intl.NumberFormat("sr-Latn-RS", {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(BigInt(whole));
  const symbol =
    currencyFormatter
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value ?? currencyCode;
  const sign = value.isNegative() && !value.isZero() ? "-" : "";
  const decimals = fraction ? `,${fraction}` : "";

  return `${sign}${number}${decimals}\u00a0${symbol}`;
}

export function Money({
  amount,
  className,
  currencyCode,
  label,
  minorUnit,
}: MoneyProps) {
  const accessibleLabel = `${label ?? "Iznos"}: ${amount} ${currencyCode}`;

  return (
    <span
      aria-label={accessibleLabel}
      className={className ?? "tabular-nums"}
      title={`${amount} ${currencyCode}`}
    >
      {formatMoney(amount, currencyCode, minorUnit)}
    </span>
  );
}
