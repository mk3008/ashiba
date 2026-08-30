import postgres from '@prisma/orm-postgres/runtime';
import { ticketContract } from '../prisma/contract.js';

/** Application-owned pool seam. Prisma owns the concrete PostgreSQL pool. */
export interface PoolProvider {
  withPool<T>(operation: (pool: unknown) => Promise<T>): Promise<T>;
}

export type PrismaTicketClient = ReturnType<typeof createPrismaTicketClient>;

export function createPrismaTicketClient(connectionString: string) {
  return postgres({ contract: ticketContract, url: connectionString });
}

export class PrismaPoolProvider implements PoolProvider {
  constructor(private readonly client: PrismaTicketClient) {}

  async withPool<T>(operation: (pool: unknown) => Promise<T>): Promise<T> {
    return operation(this.client);
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}
