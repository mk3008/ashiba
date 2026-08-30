/** Application-owned transaction seam; its policy is intentionally tool-neutral. */
export interface TransactionRunner {
  inTransaction<T>(operation: (client: unknown) => Promise<T>): Promise<T>;
}
