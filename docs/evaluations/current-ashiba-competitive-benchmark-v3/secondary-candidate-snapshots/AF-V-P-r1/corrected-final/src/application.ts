import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './prisma/contract.d.js';
import contractJson from './prisma/contract.json' with { type: 'json' };
import { createTicketUseCases } from './tickets/application/ticket-use-cases.js';

export type TicketStatus = 'open' | 'pending' | 'closed';
export type TicketSort = 'id' | 'priority' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface Runtime {
  connectionString: string;
  schema: string;
}

export interface Application {
  list(input?: { status?: TicketStatus; assignee?: string | null; sort?: TicketSort; direction?: SortDirection; offset?: number; limit?: number }): Promise<import('./tickets/dto.js').TicketDto[]>;
  get(input: { id: string }): Promise<import('./tickets/dto.js').TicketDto | null>;
  create(input: { title: string; status: TicketStatus; assignee: string | null; priority: number; metadata?: Record<string, unknown> }): Promise<import('./tickets/dto.js').TicketDto>;
  assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }>;
  close(): Promise<void>;
}

export function createApplication(runtime: Runtime): Application {
  const database = postgres<Contract>({ contractJson, url: runtime.connectionString });
  return createTicketUseCases(database);
}
