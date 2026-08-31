/** Candidate entrypoint for the ordinary layered application boundary. */
import { TicketService } from './application/ticket-service.js';
import { PgPoolProvider } from './platform/pool.js';
import { PgTransactionRunner } from './platform/transaction.js';
import { TicketController } from './presentation/ticket-controller.js';
import type { AssignTicketInput, CreateTicketInput, ListTicketsInput, TicketDto } from './contracts/ticket-dto.js';

export interface Runtime {
  connectionString: string;
  schema: string;
}

export interface Application {
  list(input?: ListTicketsInput): Promise<TicketDto[]>;
  get(input: { id: string }): Promise<TicketDto | null>;
  create(input: CreateTicketInput): Promise<TicketDto>;
  assign(input: AssignTicketInput): Promise<{ id: string; assignee: string | null }>;
  close(): Promise<void>;
}

export function createApplication(runtime: Runtime): Application {
  const pools = new PgPoolProvider(runtime.connectionString);
  const service = new TicketService(pools, new PgTransactionRunner(pools.pool));
  const controller = new TicketController(service);
  return {
    list: (input) => controller.list(input),
    get: (input) => controller.get(input),
    create: (input) => controller.create(input),
    assign: (input) => controller.assign(input),
    close: () => controller.close(),
  };
}
