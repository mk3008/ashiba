/** Application-owned transaction seam; its policy is intentionally tool-neutral. */
export interface TransactionRunner {
  inTransaction<T>(operation: (client: unknown) => Promise<T>): Promise<T>;
}

export interface PrismaTransactionalClient {
  transaction<T>(operation: (client: unknown) => Promise<T>): Promise<T>;
}

export class PrismaTransactionRunner implements TransactionRunner {
  constructor(private readonly client: PrismaTransactionalClient) {}

  async inTransaction<T>(operation: (client: unknown) => Promise<T>): Promise<T> {
    return this.client.transaction(operation);
  }
}
