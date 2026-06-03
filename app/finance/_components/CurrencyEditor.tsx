"use client";

import { SimpleListEditor, type SimpleItem } from "./SimpleListEditor";
import { addCurrency, removeCurrency, updateCurrency } from "../_actions/currencies";
import type { Currency } from "@/db/schema/finance";

export function CurrencyEditor({ currencies }: { currencies: Currency[] }) {
  const items: SimpleItem[] = currencies.map((c) => ({ id: c.id, label: c.code }));
  return (
    <SimpleListEditor
      title="Valute"
      hint="Fiat, kripto, akcije i ETF-ovi — sve što može biti currency računa."
      items={items}
      placeholder="New currency (e.g. CHF)"
      onAdd={(code, sortOrder) => addCurrency({ code, sortOrder })}
      onRename={(id, code) => updateCurrency({ id, code })}
      onRemove={(id) => removeCurrency(id)}
    />
  );
}
