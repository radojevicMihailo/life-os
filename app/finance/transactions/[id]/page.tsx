import { notFound } from "next/navigation";
import {
  getAccounts,
  getCategories,
  getCurrencies,
  getSubcategories,
  getTransaction,
  getTransactionTypes,
} from "@/lib/queries/finance";
import { TransactionForm } from "../../_components/TransactionForm";

export const dynamic = "force-dynamic";

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [tx, accounts, currencies, categories, subcategories, types] = await Promise.all([
    getTransaction(id),
    getAccounts(),
    getCurrencies(),
    getCategories(),
    getSubcategories(),
    getTransactionTypes(),
  ]);
  if (!tx) notFound();
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit transaction</h1>
        <p className="text-sm text-muted-foreground">
          Izmeni i sačuvaj — EUR/USD se preračunava na osnovu novog datuma/iznosa.
        </p>
      </div>
      <TransactionForm
        transaction={tx}
        types={types}
        accounts={accounts}
        currencies={currencies}
        categories={categories}
        subcategories={subcategories}
      />
    </div>
  );
}
