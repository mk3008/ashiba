import { createTicketApplication, type Runtime } from './tickets/application/ticket-use-cases.js';

/**
 * Candidate entrypoint. Ticket behaviour remains owned by the ticket slice;
 * this boundary only exposes the frozen application factory.
 */
export function createApplication(runtime: Runtime) {
  return createTicketApplication(runtime);
}
