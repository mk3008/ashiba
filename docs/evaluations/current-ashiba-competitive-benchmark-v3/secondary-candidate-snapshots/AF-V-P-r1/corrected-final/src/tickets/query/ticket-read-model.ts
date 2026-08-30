/** Feature-local query seam. Canonical SQL may live inside this ticket slice. */
export const ticketReadModelBoundary = 'feature-local';

import type { TicketDto } from '../dto.js';

export type RawTicketRow = {
  readonly id: bigint | number | string;
  readonly title: string;
  readonly status: string;
  readonly assignee: string | null;
  readonly priority: number;
  readonly created_at: Date | string;
  readonly metadata: unknown;
};

export const ticketRowSpec = {
  id: 'pg/int8@1', title: 'pg/text@1', status: 'pg/text@1',
  assignee: { codecId: 'pg/text@1', nullable: true }, priority: 'pg/int4@1',
  // The runner's DDL stores metadata as `jsonb`, so its raw row needs the
  // matching PostgreSQL codec. Timestamps use Prisma's temporal codec.
  created_at: 'pg/timestamptz-temporal@1', metadata: 'pg/jsonb@1',
} as const;

export function toTicketDto(row: RawTicketRow): TicketDto {
  return {
    id: String(row.id), title: row.title, status: row.status as TicketDto['status'],
    assignee: row.assignee, priority: row.priority,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString(),
    metadata: isRecord(row.metadata) ? row.metadata : {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
