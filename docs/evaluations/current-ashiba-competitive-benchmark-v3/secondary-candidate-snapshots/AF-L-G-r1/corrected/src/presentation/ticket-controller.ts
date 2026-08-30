import type { CreateTicketInput, ListTicketsInput, TicketDto } from '../contracts/ticket-dto.js';
import { TicketService } from '../application/ticket-service.js';

/** Presentation seam stays application-owned and is not a data-access tool API. */
export const ticketPresentationBoundary = 'layered';

export class TicketController {
  public constructor(private readonly service: TicketService, private readonly ensureOpen: () => void) {}

  public async list(input?: ListTicketsInput): Promise<TicketDto[]> {
    this.ensureOpen();
    return this.service.list(input);
  }

  public async get(input: { id: string }): Promise<TicketDto | null> {
    this.ensureOpen();
    return this.service.get(input);
  }

  public async create(input: CreateTicketInput): Promise<TicketDto> {
    this.ensureOpen();
    return this.service.create(input);
  }

  public async assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }> {
    this.ensureOpen();
    return this.service.assign(input);
  }
}
