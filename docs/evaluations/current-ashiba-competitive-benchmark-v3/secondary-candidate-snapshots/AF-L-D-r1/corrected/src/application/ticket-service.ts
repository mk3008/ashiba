import type { TicketDto } from '../contracts/ticket-dto.js';
import {
  TicketDataAccess,
  type CreateTicketInput,
  type ListTicketsInput,
} from '../data-access/ticket-data-access.js';
import { applicationError } from '../contracts/application-error.js';

export interface TicketApplication {
  list(input?: ListTicketsInput): Promise<TicketDto[]>;
  get(input: { id: string }): Promise<TicketDto | null>;
  create(input: CreateTicketInput): Promise<TicketDto>;
  assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }>;
  close(): Promise<void>;
}

/** Application-service seam: validates lifecycle before delegating use cases. */
export class TicketService implements TicketApplication {
  #closed = false;
  #closePromise: Promise<void> | undefined;

  public constructor(
    private readonly tickets: TicketDataAccess,
    private readonly dispose: () => Promise<void>,
  ) {}

  public async list(input?: ListTicketsInput): Promise<TicketDto[]> {
    this.assertOpen();
    return this.tickets.list(input);
  }

  public async get(input: { id: string }): Promise<TicketDto | null> {
    this.assertOpen();
    return this.tickets.get(input);
  }

  public async create(input: CreateTicketInput): Promise<TicketDto> {
    this.assertOpen();
    return this.tickets.create(input);
  }

  public async assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }> {
    this.assertOpen();
    return this.tickets.assign(input);
  }

  public close(): Promise<void> {
    if (this.#closePromise !== undefined) {
      return this.#closePromise;
    }

    this.#closed = true;
    this.#closePromise = this.dispose();
    return this.#closePromise;
  }

  private assertOpen(): void {
    if (this.#closed) {
      throw applicationError('APPLICATION_CLOSED', 'The application is closed');
    }
  }
}
