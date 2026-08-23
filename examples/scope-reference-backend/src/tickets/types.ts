export type Ticket = {
  id: number; customer_id: number; subject: string; status: string; priority: string;
  assignee_id: number | null; created_at: Date; updated_at: Date;
};
