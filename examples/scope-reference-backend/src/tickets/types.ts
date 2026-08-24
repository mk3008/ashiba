export type Ticket = {
  id: string | null; customer_id: string | null; subject: string | null; status: string | null; priority: string | null;
  assignee_id: string | null; created_at: Date | null; updated_at: Date | null;
};

export type ListTicketsSqlParams = {
  status: string | null;
  customerId: string | null;
  assigneeMode: string;
  assigneeId: string | null;
  limit: number;
  offset: number;
}

export type TicketIdSqlParams = {
  id: string;
}

export type AssignTicketSqlParams = {
  assigneeId: string;
  ticketId: string;
}

export type InsertTicketEventSqlParams = {
  ticketId: string;
  actorId: string;
  note: string | null;
}
