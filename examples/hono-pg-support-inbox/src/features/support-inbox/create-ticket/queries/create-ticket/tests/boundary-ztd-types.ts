import type { QuerySpecZtdCase } from '#tests/support/ztd/case-types.js';
import type { CreateTicketQueryParams, CreateTicketQueryResult } from '../query.js';

export type CreateTicketBeforeDb = {
  public: {
    tickets: readonly {
      ticket_id?: unknown;
      customer_id?: unknown;
      subject?: unknown;
      status?: unknown;
      priority?: unknown;
      language?: unknown;
      channel?: unknown;
      sla_due_at?: unknown;
      created_at?: unknown;
      updated_at?: unknown;
      version_key?: unknown;
      metadata?: unknown;
    }[];
  };
};

export type CreateTicketQueryBoundaryZtdCase = QuerySpecZtdCase<
  CreateTicketBeforeDb,
  CreateTicketQueryParams,
  CreateTicketQueryResult
>;

export type CreateTicketQueryMappingZtdCase = QuerySpecZtdCase<
  CreateTicketBeforeDb,
  CreateTicketQueryParams,
  CreateTicketQueryResult
>;
