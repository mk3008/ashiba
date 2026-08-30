import type { TicketDto } from './dto.js';

export interface Runtime { connectionString: string; schema: string; }
export interface ListTicketsInput {
  status?: TicketDto['status']; assignee?: string | null; sort?: 'id' | 'priority' | 'createdAt'; direction?: 'asc' | 'desc'; offset?: number; limit?: number;
}
export interface CreateTicketInput { title: string; status: TicketDto['status']; assignee: string | null; priority: number; metadata?: Record<string, unknown>; }
export interface AssignTicketInput { id: string; assignee: string | null; }
export interface Application {
  list(input?: ListTicketsInput): Promise<TicketDto[]>;
  get(input: { id: string }): Promise<TicketDto | null>;
  create(input: CreateTicketInput): Promise<TicketDto>;
  assign(input: AssignTicketInput): Promise<{ id: string; assignee: string | null }>;
  close(): Promise<void>;
}
