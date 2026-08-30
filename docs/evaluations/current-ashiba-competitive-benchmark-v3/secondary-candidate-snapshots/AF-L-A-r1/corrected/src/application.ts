/** Candidate entrypoint for the ordinary layered application boundary. */
import { Pool } from 'pg';

import { ApplicationError, TicketService, type ListInput } from './application/ticket-service.js';
import { TicketDataAccess, type TicketStatus, type TicketSort, type SortDirection } from './data-access/ticket-data-access.js';

export type { TicketStatus, TicketSort, SortDirection };

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
  list(input?: ListInput): Promise<Ticket[]>;
  get(input: { id: string }): Promise<Ticket | null>;
  create(input: { title: string; status: TicketStatus; assignee: string | null; priority: number; metadata?: Record<string, unknown> }): Promise<Ticket>;
  assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }>;
  close(): Promise<void>;
}

export { ApplicationError };

export function createApplication(runtime: Runtime): Application {
  const pool = new Pool({ connectionString: runtime.connectionString });
  const service = new TicketService(new TicketDataAccess(pool));
  let closed = false;
  let closing: Promise<void> | undefined;

  function requireOpen(): void {
    if (closed) throw new ApplicationError('APPLICATION_CLOSED', 'Application is closed');
  }

  return {
    async list(input) {
      requireOpen();
      return service.list(input);
    },
    async get(input) {
      requireOpen();
      return service.get(input);
    },
    async create(input) {
      requireOpen();
      return service.create(input);
    },
    async assign(input) {
      requireOpen();
      return service.assign(input);
    },
    async close() {
      if (closing === undefined) {
        closing = pool.end().then(() => {
          closed = true;
        });
      }
      await closing;
    },
  };
}
