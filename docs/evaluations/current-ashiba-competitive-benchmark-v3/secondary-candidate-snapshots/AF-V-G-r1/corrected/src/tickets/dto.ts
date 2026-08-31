/** Application-owned ticket DTO seam; database/tool types are not authoritative here. */
export interface TicketDto {
  id: string;
  title: string;
  status: 'open' | 'pending' | 'closed';
  assignee: string | null;
  priority: number;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export type TicketStatus = TicketDto['status'];

export interface TicketRow {
  id: string;
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  created_at: Date | string;
  metadata: Record<string, unknown>;
}

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
