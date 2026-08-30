/** Presentation seam stays application-owned and is not a data-access tool API. */
export const ticketPresentationBoundary = 'layered';

import type {
  AssignTicketInput,
  CreateTicketInput,
  ListTicketsInput,
  TicketStatus,
} from '../contracts/ticket-dto.js';
import type { TicketService } from '../application/ticket-service.js';

export class TicketController {
  constructor(private readonly service: TicketService) {}

  list(input?: ListTicketsInput) {
    return this.service.list(input);
  }

  get(input: { id: string }) {
    return this.service.get(input);
  }

  create(input: CreateTicketInput) {
    return this.service.create(input);
  }

  assign(input: AssignTicketInput) {
    return this.service.assign(input);
  }

  close() {
    return this.service.close();
  }
}

export function isTicketStatus(value: unknown): value is TicketStatus {
  return value === 'open' || value === 'pending' || value === 'closed';
}
