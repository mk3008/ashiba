/** Presentation seam stays application-owned and is not a data-access tool API. */
export const ticketPresentationBoundary = 'layered';

import type { AssignTicketInput, CreateTicketInput, ListTicketsInput, TicketDto } from '../contracts/ticket-dto.js';
import { TicketService } from '../application/ticket-service.js';

export class TicketController {
  constructor(private readonly service: TicketService, private readonly ensureOpen: () => void) {}

  list(input?: ListTicketsInput): Promise<TicketDto[]> {
    this.ensureOpen();
    return this.service.list(input);
  }

  get(input: { id: string }): Promise<TicketDto | null> {
    this.ensureOpen();
    return this.service.get(input);
  }

  create(input: CreateTicketInput): Promise<TicketDto> {
    this.ensureOpen();
    return this.service.create(input);
  }

  assign(input: AssignTicketInput): Promise<{ id: string; assignee: string | null }> {
    this.ensureOpen();
    return this.service.assign(input);
  }
}
