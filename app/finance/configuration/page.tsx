import { Separator } from "@/components/ui/separator";
import {
  getAccounts,
  getAssetGroups,
  getBuckets,
  getCategories,
  getCurrencies,
  getSubcategories,
  getTransactionTypes,
} from "@/lib/queries/finance";
import { CurrencyEditor } from "../_components/CurrencyEditor";
import { AssetGroupEditor } from "../_components/AssetGroupEditor";
import { BucketEditor } from "../_components/BucketEditor";
import { AccountEditor } from "../_components/AccountEditor";
import { CategoryEditor } from "../_components/CategoryEditor";
import { TransactionTypeEditor } from "../_components/TransactionTypeEditor";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";

export const dynamic = "force-dynamic";

export default async function FinanceConfigurationPage() {
  const [currencies, groups, buckets, accounts, categories, subcategories, types] =
    await Promise.all([
      getCurrencies(),
      getAssetGroups(),
      getBuckets(),
      getAccounts(),
      getCategories(),
      getSubcategories(),
      getTransactionTypes(),
    ]);

  const byKind = {
    income: categories.filter((c) => c.kind === "income"),
    expense: categories.filter((c) => c.kind === "expense"),
    investment: categories.filter((c) => c.kind === "investment"),
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Finance configuration</h1>
        <p className="text-sm text-muted-foreground">
          Tipovi transakcija, kategorije, računi, valute, grupe i bukete.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Tip transakcije</h2>
        <TransactionTypeEditor types={types} />
      </section>

      <Separator />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CurrencyEditor currencies={currencies} />
        <AssetGroupEditor groups={groups} />
      </section>

      <Separator />

      <section>
        <BucketEditor buckets={buckets} groups={groups} />
      </section>

      <Separator />

      <section>
        <AccountEditor accounts={accounts} groups={groups} buckets={buckets} currencies={currencies} />
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Kategorije</h2>
        <CategoryEditor
          kind="income"
          title="Kategorije za Prihod"
          categories={byKind.income}
          subcategories={subcategories}
        />
        <CategoryEditor
          kind="expense"
          title="Kategorije za Trošak"
          categories={byKind.expense}
          subcategories={subcategories}
        />
        <CategoryEditor
          kind="investment"
          title="Kategorije za Investicije"
          categories={byKind.investment}
          subcategories={subcategories}
        />
      </section>

      <ScrollToTopButton />
    </div>
  );
}
