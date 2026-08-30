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
