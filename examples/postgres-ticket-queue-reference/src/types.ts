/** Faithful to PostgreSQL's default `pg` result representation. */
export type Ticket = {
  id: string;
  customer_id: string;
  subject: string;
  status: string;
  priority: string;
  assignee_id: string | null;
  created_at: Date;
  updated_at: Date;
};

export type ListParams = {
  status: string | null;
  customerId: string | null;
  assigneeMode: 'any' | 'unassigned' | 'assigned';
  assigneeId: string | null;
  limit: number;
  offset: number;
};

export type GetParams = { id: string };
export type AssignParams = {
  ticketId: string;
  assigneeId: string;
};
export type AuditParams = {
  ticketId: string;
  actorId: string;
  note: string | null;
};
