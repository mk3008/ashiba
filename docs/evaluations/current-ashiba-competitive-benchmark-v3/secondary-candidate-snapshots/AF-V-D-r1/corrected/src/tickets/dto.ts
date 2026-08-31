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

export interface TicketListInput {
  status?: TicketStatus;
  assignee?: string | null;
  sort?: 'id' | 'priority' | 'createdAt';
  direction?: 'asc' | 'desc';
  offset?: number;
  limit?: number;
}

export interface CreateTicketInput {
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  metadata?: Record<string, unknown>;
}
