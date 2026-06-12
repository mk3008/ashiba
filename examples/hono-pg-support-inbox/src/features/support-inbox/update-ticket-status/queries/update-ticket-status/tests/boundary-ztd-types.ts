import type { QuerySpecZtdCase } from '#tests/support/ztd/case-types.js';
import type { UpdateTicketStatusQueryParams, UpdateTicketStatusQueryResult } from '../query.js';

export type UpdateTicketStatusBeforeDb = {
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

export type UpdateTicketStatusQueryBoundaryZtdCase = QuerySpecZtdCase<
  UpdateTicketStatusBeforeDb,
  UpdateTicketStatusQueryParams,
  UpdateTicketStatusQueryResult[]
>;

export type UpdateTicketStatusQueryMappingZtdCase = QuerySpecZtdCase<
  UpdateTicketStatusBeforeDb,
  UpdateTicketStatusQueryParams,
  unknown
>;

// Result columns are mapped through synthetic DB result probes so mapper tests stay focused on DTO compatibility.
