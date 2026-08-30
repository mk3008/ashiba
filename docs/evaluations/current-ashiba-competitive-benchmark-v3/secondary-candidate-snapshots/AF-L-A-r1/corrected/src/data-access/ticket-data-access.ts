/** Data-access seam. Canonical SQL/query code remains in this ordinary layer. */
import { bindNamedParameters, type ParameterBinding } from '@ashiba-ts/named-parameters';
import { compileNamedParameters } from '@ashiba-ts/named-parameters/compiler';
import type { Pool, PoolClient, QueryResultRow } from 'pg';

import type { TicketDto } from '../contracts/ticket-dto.js';

export const ticketDataAccessBoundary = 'layered';

export type TicketStatus = TicketDto['status'];
export type TicketSort = 'id' | 'priority' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface TicketListOptions {
  status?: TicketStatus;
  hasAssignee: boolean;
  assignee?: string | null;
  sort: TicketSort;
  direction: SortDirection;
  offset: number;
  limit: number;
}

export interface CreateTicketInput {
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  metadata: Record<string, unknown>;
}

export interface AssignTicketInput {
  id: string;
  assignee: string | null;
}

type Queryable = Pick<Pool, 'query'> | PoolClient;

export class TicketNotFoundError extends Error {
  constructor() {
    super('Ticket was not found');
    this.name = 'TicketNotFoundError';
  }
}

const ticketColumns = `
  id,
  title,
  status,
  assignee,
  priority,
  created_at,
  metadata
`;

const sortColumns: Record<TicketSort, string> = {
  id: 'id',
  priority: 'priority',
  createdAt: 'created_at',
};

const sortDirections: Record<SortDirection, string> = {
  asc: 'ASC',
  desc: 'DESC',
};

const listStatements = new Map<string, ParameterBinding>();

function listStatement(options: TicketListOptions): ParameterBinding {
  const filterKey = `${options.status === undefined ? 'all' : 'status'}-${options.hasAssignee ? 'assignee' : 'all'}`;
  const key = `${filterKey}-${options.sort}-${options.direction}`;
  const cached = listStatements.get(key);
  if (cached) return cached;

  const predicates: string[] = [];
  if (options.status !== undefined) predicates.push('status = :status::ticket_status');
  if (options.hasAssignee) predicates.push('assignee IS NOT DISTINCT FROM :assignee');
  const where = predicates.length === 0 ? '' : `WHERE ${predicates.join(' AND ')}`;
  const statement = compileNamedParameters(`
    SELECT ${ticketColumns}
    FROM tickets
    ${where}
    ORDER BY ${sortColumns[options.sort]} ${sortDirections[options.direction]}, id ASC
    OFFSET :offset
    LIMIT :limit
  `);
  listStatements.set(key, statement);
  return statement;
}

const getStatement = compileNamedParameters(`
  SELECT ${ticketColumns}
  FROM tickets
  WHERE id = :id
`);

const createStatement = compileNamedParameters(`
  INSERT INTO tickets (title, status, assignee, priority, created_at, metadata)
  VALUES (:title, :status::ticket_status, :assignee, :priority, CURRENT_TIMESTAMP, :metadata::jsonb)
  RETURNING ${ticketColumns}
`);

const assignStatement = compileNamedParameters(`
  UPDATE tickets
  SET assignee = :assignee
  WHERE id = :id
  RETURNING id, assignee
`);

const auditStatement = compileNamedParameters(`
  INSERT INTO ticket_audit (ticket_id, action, detail, created_at)
  VALUES (:ticketId, 'assign', :detail, CURRENT_TIMESTAMP)
`);

function execute<Row extends QueryResultRow>(queryable: Queryable, statement: ParameterBinding, params: Record<string, unknown>) {
  const bound = bindNamedParameters(statement, params);
  return queryable.query<Row>(bound.sql, [...bound.values]);
}

function timestampToIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) throw new Error('Database returned an invalid ticket timestamp');
  return parsed.toISOString();
}

function toTicket(row: Record<string, unknown>): TicketDto {
  return {
    id: String(row.id),
    title: String(row.title),
    status: row.status as TicketStatus,
    assignee: row.assignee === null ? null : String(row.assignee),
    priority: Number(row.priority),
    createdAt: timestampToIso(row.created_at),
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}

export class TicketDataAccess {
  constructor(private readonly pool: Pool) {}

  async list(options: TicketListOptions): Promise<TicketDto[]> {
    const params: Record<string, unknown> = { offset: options.offset, limit: options.limit };
    if (options.status !== undefined) params.status = options.status;
    if (options.hasAssignee) params.assignee = options.assignee;
    const result = await execute<Record<string, unknown>>(this.pool, listStatement(options), params);
    return result.rows.map(toTicket);
  }

  async get(id: string): Promise<TicketDto | null> {
    const result = await execute<Record<string, unknown>>(this.pool, getStatement, { id });
    return result.rows[0] === undefined ? null : toTicket(result.rows[0]);
  }

  async create(input: CreateTicketInput): Promise<TicketDto> {
    const result = await execute<Record<string, unknown>>(this.pool, createStatement, { ...input });
    const row = result.rows[0];
    if (row === undefined) throw new Error('Ticket insert returned no row');
    return toTicket(row);
  }

  async assign(input: AssignTicketInput): Promise<{ id: string; assignee: string | null }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const updated = await execute<Record<string, unknown>>(client, assignStatement, { ...input });
      const row = updated.rows[0];
      if (row === undefined) {
        throw new TicketNotFoundError();
      }
      await execute(client, auditStatement, {
        ticketId: String(row.id),
        detail: JSON.stringify({ assignee: row.assignee === null ? null : String(row.assignee) }),
      });
      await client.query('COMMIT');
      return { id: String(row.id), assignee: row.assignee === null ? null : String(row.assignee) };
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // The original database error is the useful failure for callers.
      }
      throw error;
    } finally {
      client.release();
    }
  }
}
