import {
  getAccounts,
  getCategories,
  getCurrencies,
  getSubcategories,
  getTransactionTypes,
} from "@/lib/queries/finance";
import { TransactionForm } from "../../_components/TransactionForm";

export const dynamic = "force-dynamic";

export default async function NewTransactionPage() {
  const [accounts, currencies, categories, subcategories, types] = await Promise.all([
    getAccounts(),
    getCurrencies(),
    getCategories(),
    getSubcategories(),
    getTransactionTypes(),
  ]);
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New transaction</h1>
        <p className="text-sm text-muted-foreground">
          Polja EUR/USD se automatski popunjavaju pri snimanju koristeći ECB/CoinGecko/Yahoo.
        </p>
      </div>
      <TransactionForm
        types={types}
        accounts={accounts}
        currencies={currencies}
        categories={categories}
        subcategories={subcategories}
      />
    </div>
  );
}
