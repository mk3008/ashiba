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
  customerId: string | bigint | null;
  assigneeMode: string | null;
  assigneeId: string | bigint | null;
  limit: number | null;
  offset: number | null;
};

export type GetParams = { id: string | bigint | null };
export type AssignParams = {
  ticketId: string | bigint | null;
  assigneeId: string | bigint | null;
};
export type AuditParams = {
  ticketId: string | bigint | null;
  actorId: string | bigint | null;
  note: string | null;
};
