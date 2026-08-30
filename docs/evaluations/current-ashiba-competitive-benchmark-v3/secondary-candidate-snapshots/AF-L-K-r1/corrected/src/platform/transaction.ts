/** Application-owned transaction seam; its policy is intentionally tool-neutral. */
import type { Kysely } from 'kysely';

export interface TransactionRunner<Database> {
  inTransaction<T>(operation: (client: Kysely<Database>) => Promise<T>): Promise<T>;
}

/** Keeps transaction ownership out of the presentation and service layers. */
export class KyselyTransactionRunner<Database> implements TransactionRunner<Database> {
  constructor(private readonly database: Kysely<Database>) {}

  inTransaction<T>(operation: (client: Kysely<Database>) => Promise<T>): Promise<T> {
    return this.database.transaction().execute(operation);
  }
}
