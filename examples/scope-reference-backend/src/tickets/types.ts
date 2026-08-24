export type Ticket = {
  id: string; customer_id: string; subject: string; status: string; priority: string;
  assignee_id: string | null; created_at: Date; updated_at: Date;
};
