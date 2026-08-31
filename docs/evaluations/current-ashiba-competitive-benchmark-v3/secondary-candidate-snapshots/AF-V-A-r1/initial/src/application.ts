import { Pool } from 'pg';

import {
  createTicketUseCases,
  validationError,
  type AssignTicketInput,
  type CreateTicketInput,
  type ListTicketsInput,
} from './tickets/application/ticket-use-cases.js';
import type { TicketDto } from './tickets/dto.js';

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

/**
 * Application composition stays small: the ordinary ticket slice owns its
 * SQL and use cases while this entrypoint owns the native-pg lifecycle.
 */
export function createApplication(runtime: Runtime): Application {
  if (typeof runtime?.connectionString !== 'string' || runtime.connectionString.length === 0) {
    throw validationError('runtime.connectionString must be a non-empty string');
  }

  // The supplied candidate role already has the nonce schema as its search path.
  // Keeping identifiers canonical avoids treating runtime values as SQL syntax.
  const pool = new Pool({ connectionString: runtime.connectionString });
  const tickets = createTicketUseCases(pool);
  let closed = false;

  function requireOpen(): void {
    if (closed) {
      throw Object.assign(new Error('application is closed'), { code: 'APPLICATION_CLOSED' as const });
    }
  }

  return {
    async list(input = {}): Promise<TicketDto[]> {
      requireOpen();
      return tickets.list(input);
    },
    async get(input: { id: string }): Promise<TicketDto | null> {
      requireOpen();
      return tickets.get(input);
    },
    async create(input: CreateTicketInput): Promise<TicketDto> {
      requireOpen();
      return tickets.create(input);
    },
    async assign(input: AssignTicketInput): Promise<{ id: string; assignee: string | null }> {
      requireOpen();
      return tickets.assign(input);
    },
    async close(): Promise<void> {
      if (closed) {
        return;
      }
      closed = true;
      await pool.end();
    },
  };
}
