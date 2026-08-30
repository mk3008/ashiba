import { bindNamedParameters } from '@ashiba-ts/named-parameters';
import { bindingMetadata as listMetadata } from '../generated/listTickets.js';
import { bindingMetadata as getMetadata } from '../generated/getTicket.js';
import { bindingMetadata as assignMetadata } from '../generated/assignTicket.js';
import { bindingMetadata as eventMetadata } from '../generated/insertTicketEvent.js';
import type { QueryExecutor, QueryResult } from './pgTypes.js';

export type TicketRow = {
  id: string;
  subject: string;
  status: string;
  assignee_id: string | null;
  created_at: Date;
  audit_count: number;
  latest_event_kind: string | null;
  latest_event_at: Date | null;
};

export type AssignRow = Pick<TicketRow, 'id' | 'subject' | 'status' | 'assignee_id' | 'created_at'>;

type ListParams = {
  status: string | null;
  assigneeId: string | null;
  limit: number;
  offset: number;
};

export type ReviewedSortOrder =
  | 't.created_at ASC, t.id ASC'
  | 't.created_at DESC, t.id ASC'
  | 't.subject ASC, t.id ASC'
  | 't.subject DESC, t.id ASC';

export interface TicketAccess {
  list(executor: QueryExecutor, params: ListParams, orderBy: ReviewedSortOrder): Promise<TicketRow[]>;
  get(executor: QueryExecutor, ticketId: string): Promise<TicketRow | null>;
  assign(executor: QueryExecutor, ticketId: string, assigneeId: string | null): Promise<AssignRow | null>;
  addEvent(executor: QueryExecutor, ticketId: string, kind: string): Promise<void>;
}

function postgres(metadata: { bindings: { postgres: Parameters<typeof bindNamedParameters>[0] } }) {
  return metadata.bindings.postgres;
}

export class SqlTicketAccess implements TicketAccess {
  async list(executor: QueryExecutor, params: ListParams, orderBy: ReviewedSortOrder): Promise<TicketRow[]> {
    const template = postgres(listMetadata);
    const anchor = 'ORDER BY t.created_at ASC, t.id ASC';
    if (!template.sql.includes(anchor)) throw new Error('list query is missing its reviewed ORDER BY anchor');
    const statement = bindNamedParameters({ ...template, sql: template.sql.replace(anchor, `ORDER BY ${orderBy}`) }, params);
    const result = await executor.query<TicketRow>(statement.sql, [...statement.values]);
    return result.rows;
  }

  async get(executor: QueryExecutor, ticketId: string): Promise<TicketRow | null> {
    const statement = bindNamedParameters(postgres(getMetadata), { ticketId });
    const result = await executor.query<TicketRow>(statement.sql, [...statement.values]);
    return result.rows[0] ?? null;
  }

  async assign(executor: QueryExecutor, ticketId: string, assigneeId: string | null): Promise<AssignRow | null> {
    const statement = bindNamedParameters(postgres(assignMetadata), { ticketId, assigneeId });
    const result = await executor.query<AssignRow>(statement.sql, [...statement.values]);
    return result.rows[0] ?? null;
  }

  async addEvent(executor: QueryExecutor, ticketId: string, kind: string): Promise<void> {
    const statement = bindNamedParameters(postgres(eventMetadata), { ticketId, kind });
    await executor.query(statement.sql, [...statement.values]);
  }
}
