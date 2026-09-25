import type { PgTransactionConfig } from "drizzle-orm/pg-core";

import { db, type DbTx } from "./client";

export interface UnitOfWork {
  run<T>(
    work: (tx: DbTx) => Promise<T>,
    config?: PgTransactionConfig,
  ): Promise<T>;
}

export const unitOfWork: UnitOfWork = {
  run: (work, config) => db.transaction((tx) => work(tx), config),
};
