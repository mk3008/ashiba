import type {
  AssignTicketInput,
  CreateTicketInput,
  ListTicketsInput,
  RuntimeConfig,
  TicketDto,
} from './contracts/ticket-dto.js';
import { TicketService } from './application/ticket-service.js';
import { TicketDataAccess } from './data-access/ticket-data-access.js';
import { PrismaPoolProvider, createPrismaTicketClient } from './platform/pool.js';
import { PrismaTransactionRunner } from './platform/transaction.js';

export interface Application {
  list(input?: ListTicketsInput): Promise<TicketDto[]>;
  get(input: { id: string }): Promise<TicketDto | null>;
  create(input: CreateTicketInput): Promise<TicketDto>;
  assign(input: AssignTicketInput): Promise<{ id: string; assignee: string | null }>;
  close(): Promise<void>;
}

/** Candidate entrypoint for the ordinary layered application boundary. */
export function createApplication(runtime: RuntimeConfig): Application {
  const client = createPrismaTicketClient(runtime.connectionString);
  const pool = new PrismaPoolProvider(client);
  const transactions = new PrismaTransactionRunner(client);
  const dataAccess = new TicketDataAccess(client, transactions);
  const service = new TicketService(dataAccess);
  let closePromise: Promise<void> | undefined;

  return {
    list: (input) => service.list(input),
    get: (input) => service.get(input),
    create: (input) => service.create(input),
    assign: (input) => service.assign(input),
    close: async () => {
      service.close();
      closePromise ??= pool.close();
      await closePromise;
    },
  };
}
