import type { CreateTicketInput, ListTicketsInput, TicketDto } from './contracts/ticket-dto.js';
import { ApplicationError, TicketService } from './application/ticket-service.js';
import { TicketDataAccess } from './data-access/ticket-data-access.js';
import { NativePgPoolProvider } from './platform/pool.js';
import { NativePgTransactionRunner } from './platform/transaction.js';
import { TicketController } from './presentation/ticket-controller.js';

export interface Runtime {
  connectionString: string;
  schema: string;
}

export interface Application {
  list(input?: ListTicketsInput): Promise<TicketDto[]>;
  get(input: { id: string }): Promise<TicketDto | null>;
  create(input: CreateTicketInput): Promise<TicketDto>;
  assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }>;
  close(): Promise<void>;
}

/** Candidate entrypoint for the ordinary layered application boundary. */
export function createApplication(runtime: Runtime): Application {
  if (runtime === null || typeof runtime !== 'object' || typeof runtime.connectionString !== 'string' || runtime.connectionString.length === 0) {
    throw new ApplicationError('VALIDATION');
  }

  const pools = new NativePgPoolProvider(runtime.connectionString);
  let closed = false;
  let closing: Promise<void> | undefined;
  const ensureOpen = (): void => {
    if (closed) throw new ApplicationError('APPLICATION_CLOSED');
  };
  const service = new TicketService(pools, new TicketDataAccess(), new NativePgTransactionRunner(pools));
  const controller = new TicketController(service, ensureOpen);

  return {
    list: (input?: ListTicketsInput) => controller.list(input),
    get: (input: { id: string }) => controller.get(input),
    create: (input: CreateTicketInput) => controller.create(input),
    assign: (input: { id: string; assignee: string | null }) => controller.assign(input),
    async close() {
      if (closing === undefined) {
        closed = true;
        closing = pools.close();
      }
      await closing;
    },
  };
}
