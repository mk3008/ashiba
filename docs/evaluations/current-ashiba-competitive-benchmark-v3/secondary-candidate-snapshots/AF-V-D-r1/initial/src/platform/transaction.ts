import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

/** Application-owned transaction seam; its policy is intentionally tool-neutral. */
export interface TransactionRunner {
  inTransaction<T>(operation: (client: unknown) => Promise<T>): Promise<T>;
}


export type DrizzleDatabase = NodePgDatabase<Record<string, never>>;

/** Adapts Drizzle transactions to the application-owned transaction seam. */
export class DrizzleTransactionRunner implements TransactionRunner {
  constructor(private readonly database: DrizzleDatabase) {}

  async inTransaction<T>(operation: (client: unknown) => Promise<T>): Promise<T> {
    return this.database.transaction(async (transaction) => operation(transaction));
  }
}
