import { bindNamedParameters, type ParameterBinding } from '@ashiba-ts/named-parameters';
import { compileNamedParameters } from '@ashiba-ts/named-parameters/compiler';
import type { QueryResultRow } from 'pg';

import type { TicketDto } from '../dto.js';

/** Feature-local query seam. Canonical SQL may live inside this ticket slice. */
export const ticketReadModelBoundary = 'feature-local';

export type TicketQueryClient = {
  query<Row extends QueryResultRow>(query: { text: string; values: unknown[] }): Promise<{ rows: Row[]; rowCount: number | null }>;
};

export type TicketListInput = {
  status?: 'open' | 'pending' | 'closed';
  assignee?: string | null;
  sort?: 'id' | 'priority' | 'createdAt';
  direction?: 'asc' | 'desc';
  offset?: number;
  limit?: number;
};

const ticketColumns = `
  id,
  title,
  status,
  assignee,
  priority,
  created_at,
  metadata
`;

const getTicket = compileNamedParameters(`
  SELECT ${ticketColumns}
  FROM tickets
  WHERE id = :id
`);

const listOrderClauses = {
  id: { asc: 'id ASC, id ASC', desc: 'id DESC, id ASC' },
  priority: { asc: 'priority ASC, id ASC', desc: 'priority DESC, id ASC' },
  createdAt: { asc: 'created_at ASC, id ASC', desc: 'created_at DESC, id ASC' },
} as const;

type TicketSort = keyof typeof listOrderClauses;
type SortDirection = keyof (typeof listOrderClauses)['id'];

const listTickets: Record<TicketSort, Record<SortDirection, ParameterBinding>> = {
  id: {
    asc: compileListQuery(listOrderClauses.id.asc),
    desc: compileListQuery(listOrderClauses.id.desc),
  },
  priority: {
    asc: compileListQuery(listOrderClauses.priority.asc),
    desc: compileListQuery(listOrderClauses.priority.desc),
  },
  createdAt: {
    asc: compileListQuery(listOrderClauses.createdAt.asc),
    desc: compileListQuery(listOrderClauses.createdAt.desc),
  },
};

function compileListQuery(orderBy: string): ParameterBinding {
  // `orderBy` comes only from the finite source-controlled mapping above.
  return compileNamedParameters(`
    SELECT ${ticketColumns}
    FROM tickets
    WHERE (:hasStatus = false OR status = :status)
      AND (
        :hasAssignee = false
        OR (:assigneeIsNull = true AND assignee IS NULL)
        OR (:assigneeIsNull = false AND assignee = :assignee)
      )
    ORDER BY ${orderBy}
    OFFSET :offset
    LIMIT :limit
  `);
}

export async function findTicket(client: TicketQueryClient, id: string): Promise<TicketDto | null> {
  const bound = bindNamedParameters(getTicket, { id });
  const result = await client.query<TicketRow>({ text: bound.sql, values: [...bound.values] });
  return result.rows[0] ? toTicketDto(result.rows[0]) : null;
}

export async function listTicketRows(
  client: TicketQueryClient,
  input: TicketListInput & { sort: TicketSort; direction: SortDirection; offset: number; limit: number },
): Promise<TicketDto[]> {
  const hasStatus = input.status !== undefined;
  const hasAssignee = input.assignee !== undefined;
  const prepared = listTickets[input.sort][input.direction];
  const bound = bindNamedParameters(prepared, {
    hasStatus,
    status: input.status ?? null,
    hasAssignee,
    assigneeIsNull: input.assignee === null,
    assignee: input.assignee ?? null,
    offset: input.offset,
    limit: input.limit,
  });
  const result = await client.query<TicketRow>({ text: bound.sql, values: [...bound.values] });
  return result.rows.map(toTicketDto);
}

type TicketRow = QueryResultRow & {
  id: string | number;
  title: string;
  status: TicketDto['status'];
  assignee: string | null;
  priority: number;
  created_at: Date | string;
  metadata: unknown;
};

export function toTicketDto(row: TicketRow): TicketDto {
  const createdAt = row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString();
  return {
    id: String(row.id),
    title: row.title,
    status: row.status,
    assignee: row.assignee,
    priority: row.priority,
    createdAt,
    metadata: isRecord(row.metadata) ? row.metadata : {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
