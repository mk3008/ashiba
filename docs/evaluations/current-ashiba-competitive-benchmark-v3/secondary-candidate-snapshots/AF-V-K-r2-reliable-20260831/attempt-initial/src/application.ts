import { createTicketApplication } from './tickets/application/ticket-use-cases.js';

export interface Runtime {
  connectionString: string;
  schema: string;
}

/** Entry into the feature-local ticket slice. */
export function createApplication(runtime: Runtime) {
  return createTicketApplication(runtime);
}
