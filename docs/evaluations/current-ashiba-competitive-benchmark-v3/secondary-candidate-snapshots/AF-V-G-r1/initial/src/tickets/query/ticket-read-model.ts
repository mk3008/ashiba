import type { QueryResultRow } from 'pg';

import type { TicketDto } from '../dto.js';

/** Feature-local query seam. Canonical SQL may live inside this ticket slice. */
export const ticketReadModelBoundary = 'feature-local';

type TicketRow = QueryResultRow & {
  id: string | number | bigint;
  title: string;
  status: TicketDto['status'];
  assignee: string | null;
  priority: number;
  created_at: Date | string;
  metadata: unknown;
};

export const ticketColumns = `id, title, status, assignee, priority, created_at, metadata`;

/** Maps native-pg values onto the application-owned DTO boundary. */
export function toTicketDto(row: TicketRow): TicketDto {
  const date = row.created_at instanceof Date ? row.created_at : new Date(row.created_at);
  if (Number.isNaN(date.valueOf())) {
    throw new Error('database returned an invalid ticket timestamp');
  }
  if (row.metadata === null || typeof row.metadata !== 'object' || Array.isArray(row.metadata)) {
    throw new Error('database returned invalid ticket metadata');
  }
  return {
    id: String(row.id),
    title: row.title,
    status: row.status,
    assignee: row.assignee,
    priority: Number(row.priority),
    createdAt: date.toISOString(),
    metadata: row.metadata as Record<string, unknown>,
  };
}
