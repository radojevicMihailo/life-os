import { Money } from "./money";

export interface TransactionAmount {
  accountName: string;
  amount: string;
  currencyCode: string;
}

export function TransactionAmounts({
  amounts,
}: {
  amounts: TransactionAmount[];
}) {
  return (
    <div className="space-y-1 text-sm">
      {amounts.map((value) => (
        <div
          className="flex flex-wrap items-baseline justify-end gap-x-2"
          key={`${value.accountName}-${value.currencyCode}-${value.amount}`}
        >
          <span className="text-slate-400">{value.accountName}:</span>
          <Money
            amount={value.amount}
            currencyCode={value.currencyCode}
            label={`Iznos za ${value.accountName}`}
          />
        </div>
      ))}
    </div>
  );
}
