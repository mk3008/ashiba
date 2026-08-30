import { Pool } from 'pg';
import { bindNamedParameters } from '@ashiba-ts/named-parameters';
import { bindingMetadata as assignBinding } from '../generated/assign-ticket.generated.js';
import { bindingMetadata as closeBinding } from '../generated/close-ticket.generated.js';
import { bindingMetadata as getBinding } from '../generated/get.generated.js';
import { bindingMetadata as eventBinding } from '../generated/insert-assignment-event.generated.js';
import { bindingMetadata as createdAscBinding } from '../generated/list-createdAt-asc.generated.js';
import { bindingMetadata as createdDescBinding } from '../generated/list-createdAt-desc.generated.js';
import { bindingMetadata as subjectAscBinding } from '../generated/list-subject-asc.generated.js';
import { bindingMetadata as subjectDescBinding } from '../generated/list-subject-desc.generated.js';

export type TicketSortKey = 'createdAt' | 'subject';
export type TicketSortDirection = 'asc' | 'desc';

export interface ListTicketsInput {
  status?: string | null;
  assigneeId?: number | string | null;
  limit?: number;
  offset?: number;
  sortKey?: TicketSortKey;
  sortDirection?: TicketSortDirection;
}

export interface Ticket {
  id: number | string;
  subject: string;
  status: string;
  assigneeId: number | string | null;
  createdAt: Date | string;
  auditCount: number;
}

interface QueryResult<T> {
  rows: T[];
}

export interface DbClient {
  query<T>(sql: string, values?: readonly unknown[]): Promise<QueryResult<T>>;
  release(): void;
}

interface DbPool {
  query<T>(sql: string, values?: readonly unknown[]): Promise<QueryResult<T>>;
  connect(): Promise<DbClient>;
  end(): Promise<void>;
}

export interface TicketApplicationOptions {
  pool?: DbPool;
  /** Test seam for proving rollback when recording the audit event fails. */
  auditWriter?: (client: DbClient, ticketId: number | string) => Promise<void>;
  injectAuditFailure?: boolean;
}

export interface TicketApplication {
  list(input?: ListTicketsInput): Promise<Ticket[]>;
  get(ticketId: number | string): Promise<Ticket | null>;
  assign(ticketId: number | string, assigneeId: number | string | null, options?: { auditFailure?: boolean }): Promise<Ticket | null>;
  close(ticketId: number | string): Promise<Ticket | null>;
  dispose(): Promise<void>;
}

type TicketRow = Ticket;
type GeneratedBinding = {
  bindings: {
    postgres: { style: 'indexed'; sql: string; parameterNames: readonly string[] };
  };
};
const listBindings: Record<string, GeneratedBinding> = {
  'createdAt:asc': createdAscBinding,
  'createdAt:desc': createdDescBinding,
  'subject:asc': subjectAscBinding,
  'subject:desc': subjectDescBinding,
};

export function createTicketApplication(
  connectionString: string,
  options?: TicketApplicationOptions,
): TicketApplication;
export function createTicketApplication(
  config: { connectionString?: string; pool?: DbPool; auditWriter?: TicketApplicationOptions['auditWriter']; injectAuditFailure?: boolean },
): TicketApplication;
export function createTicketApplication(
  connectionOrConfig: string | { connectionString?: string; pool?: DbPool; auditWriter?: TicketApplicationOptions['auditWriter']; injectAuditFailure?: boolean },
  options: TicketApplicationOptions = {},
): TicketApplication {
  const config = typeof connectionOrConfig === 'string'
    ? { connectionString: connectionOrConfig, ...options }
    : connectionOrConfig;
  const pool: DbPool = config.pool ?? (new Pool({ connectionString: config.connectionString }) as unknown as DbPool);
  const auditWriter = config.auditWriter ?? (async (client: DbClient, ticketId: number | string) => {
    const query = bindNamedParameters(eventBinding.bindings.postgres, { ticketId });
    await client.query(query.sql, query.values);
  });

  const list = async (input: ListTicketsInput = {}): Promise<Ticket[]> => {
    const limit = input.limit ?? 50;
    const offset = input.offset ?? 0;
    if (!Number.isInteger(limit) || limit < 0 || limit > 1000) throw new RangeError('limit must be an integer between 0 and 1000');
    if (!Number.isInteger(offset) || offset < 0) throw new RangeError('offset must be a non-negative integer');
    const key = `${input.sortKey ?? 'createdAt'}:${input.sortDirection ?? 'asc'}`;
    const selected = listBindings[key];
    if (!selected) throw new RangeError('unsupported ticket sort');
    const query = bindNamedParameters(selected.bindings.postgres, {
      status: input.status ?? null,
      assigneeId: input.assigneeId ?? null,
      limit,
      offset,
    });
    const result = await pool.query<TicketRow>(query.sql, query.values);
    return result.rows;
  };

  const get = async (ticketId: number | string): Promise<Ticket | null> => {
    const query = bindNamedParameters(getBinding.bindings.postgres, { ticketId });
    const result = await pool.query<TicketRow>(query.sql, query.values);
    return result.rows[0] ?? null;
  };

  const assign = async (
    ticketId: number | string,
    assigneeId: number | string | null,
    assignOptions: { auditFailure?: boolean } = {},
  ): Promise<Ticket | null> => {
    const client = await pool.connect();
    try {
      await client.query('begin');
      const update = bindNamedParameters(assignBinding.bindings.postgres, { ticketId, assigneeId });
      const result = await client.query<TicketRow>(update.sql, update.values);
      const row = result.rows[0];
      if (!row) {
        await client.query('commit');
        return null;
      }
      if (assignOptions.auditFailure || config.injectAuditFailure) throw new Error('injected audit failure');
      await auditWriter(client, ticketId);
      await client.query('commit');
      return row;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  };

  const close = async (ticketId: number | string): Promise<Ticket | null> => {
    const query = bindNamedParameters(closeBinding.bindings.postgres, { ticketId });
    const result = await pool.query<TicketRow>(query.sql, query.values);
    return result.rows[0] ?? null;
  };

  return {
    list,
    get,
    assign,
    close,
    dispose: async () => { if (!config.pool) await pool.end(); },
  };
}
