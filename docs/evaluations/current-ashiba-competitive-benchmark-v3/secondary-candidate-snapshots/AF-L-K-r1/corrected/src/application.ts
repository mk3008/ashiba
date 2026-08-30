/** Candidate entrypoint for the ordinary layered application boundary. */
import { Kysely, PostgresDialect } from 'kysely';

import { TicketService, type ApplicationError } from './application/ticket-service.js';
import type { AssignTicketInput, CreateTicketInput, ListTicketsInput, TicketDto } from './contracts/ticket-dto.js';
import { TicketDataAccess, type TicketDatabase } from './data-access/ticket-data-access.js';
import { NativePgPoolProvider } from './platform/pool.js';
import { KyselyTransactionRunner } from './platform/transaction.js';
import { TicketController } from './presentation/ticket-controller.js';

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

function closedError(): ApplicationError {
  const error = new Error('application is closed') as ApplicationError;
  error.code = 'APPLICATION_CLOSED';
  return error;
}

/**
 * Kysely's PostgresDialect is configured with the application-owned pg Pool.
 * The nonce schema is selected through Kysely's identifier API, not SQL text.
 */
export function createApplication(runtime: Runtime): Application {
  const poolProvider = new NativePgPoolProvider(runtime.connectionString);
  const database = new Kysely<TicketDatabase>({
    dialect: new PostgresDialect({ pool: poolProvider.pool }),
  }).withSchema(runtime.schema);
  const transactions = new KyselyTransactionRunner(database);
  const tickets = new TicketDataAccess(database, transactions);

  let closed = false;
  let closePromise: Promise<void> | undefined;
  const controller = new TicketController(new TicketService(tickets), () => {
    if (closed) throw closedError();
  });

  return {
    list: (input) => controller.list(input),
    get: (input) => controller.get(input),
    create: (input) => controller.create(input),
    assign: (input) => controller.assign(input),
    close: () => {
      if (closePromise === undefined) {
        closePromise = database.destroy().then(() => {
          closed = true;
        });
      }
      return closePromise;
    },
  };
}
