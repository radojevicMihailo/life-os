import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getAccounts,
  getCategories,
  getCurrencies,
  getTransactionTypes,
  getTransactions,
} from "@/lib/queries/finance";
import { TransactionList } from "../_components/TransactionList";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const [rows, types, accounts, currencies, categories] = await Promise.all([
    getTransactions(),
    getTransactionTypes(),
    getAccounts(),
    getCurrencies(),
    getCategories(),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            Loguj svaku transakciju. EUR/USD vrednost se automatski računa pri snimanju.
          </p>
        </div>
        <Link href="/finance/transactions/new">
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" /> New transaction
          </Button>
        </Link>
      </div>
      <TransactionList
        rows={rows}
        types={types}
        accounts={accounts}
        currencies={currencies}
        categories={categories}
      />
    </div>
  );
}
