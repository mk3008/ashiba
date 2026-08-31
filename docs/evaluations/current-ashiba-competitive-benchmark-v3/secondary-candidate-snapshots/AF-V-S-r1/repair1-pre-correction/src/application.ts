import { Pool } from 'pg';
import { PgPoolProvider } from './platform/pool.js';
import { PgTransactionRunner } from './platform/transaction.js';
import { TicketUseCases } from './tickets/application/ticket-use-cases.js';
import { TicketQueries } from './tickets/sql/generated/queries.js';

export type TicketStatus = 'open' | 'pending' | 'closed';
export type TicketSort = 'id' | 'priority' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface Runtime {
  connectionString: string;
  schema: string;
}

export interface Ticket {
  id: string;
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface Application {
  list(input?: {
    status?: TicketStatus;
    assignee?: string | null;
    sort?: TicketSort;
    direction?: SortDirection;
    offset?: number;
    limit?: number;
  }): Promise<Ticket[]>;
  get(input: { id: string }): Promise<Ticket | null>;
  create(input: {
    title: string;
    status: TicketStatus;
    assignee: string | null;
    priority: number;
    metadata?: Record<string, unknown>;
  }): Promise<Ticket>;
  assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }>;
  close(): Promise<void>;
}

/**
 * Application composition stays deliberately small: native-pg owns the pool
 * and transaction policy while sqlc-generated ticket queries own SQL access.
 */
export function createApplication(runtime: Runtime): Application {
  const pool = new Pool({ connectionString: runtime.connectionString });
  const poolProvider = new PgPoolProvider(pool);
  const transactions = new PgTransactionRunner(pool);
  const queries = new TicketQueries();
  const tickets = new TicketUseCases(poolProvider, transactions, queries);
  let closed = false;

  return {
    list: (input) => tickets.list(input, () => closed),
    get: (input) => tickets.get(input, () => closed),
    create: (input) => tickets.create(input, () => closed),
    assign: (input) => tickets.assign(input, () => closed),
    async close(): Promise<void> {
      if (!closed) {
        closed = true;
        await pool.end();
      }
    },
  };
}
