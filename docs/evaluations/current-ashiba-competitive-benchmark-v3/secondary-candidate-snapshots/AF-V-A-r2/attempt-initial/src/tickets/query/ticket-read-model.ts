import { bindNamedParameters } from '@ashiba-ts/named-parameters';
import type { PoolClient } from 'pg';
import { ticketSql } from '../sql/tickets.js';
import type { TicketDto } from '../dto.js';

/** Feature-local query seam. Canonical SQL remains in this ticket slice. */
export const ticketReadModelBoundary = 'feature-local';

type TicketRow = {
  id: string;
  title: string;
  status: TicketDto['status'];
  assignee: string | null;
  priority: number;
  created_at: Date | string;
  metadata: Record<string, unknown>;
};

export function toTicketDto(row: TicketRow): TicketDto {
  return {
    id: String(row.id),
    title: row.title,
    status: row.status,
    assignee: row.assignee,
    priority: row.priority,
    createdAt: new Date(row.created_at).toISOString(),
    metadata: row.metadata,
  };
}

export async function readTicket(client: PoolClient, id: string): Promise<TicketDto | null> {
  const bound = bindNamedParameters(ticketSql.get, { id });
  const result = await client.query<TicketRow>(bound.sql, [...bound.values]);
  const row = result.rows[0];
  return row === undefined ? null : toTicketDto(row);
}
