import type { QuerySpecZtdCase } from '#tests/support/ztd/case-types.js';
import type { GetTicketDetailQueryParams, GetTicketDetailQueryResult } from '../query.js';

export type GetTicketDetailBeforeDb = {
  public: {
    customers: readonly {
      customer_id?: unknown;
      name?: unknown;
      tier?: unknown;
      locale?: unknown;
      created_at?: unknown;
    }[];
    ticket_messages: readonly {
      message_id?: unknown;
      ticket_id?: unknown;
      sender_name?: unknown;
      sender_role?: unknown;
      body?: unknown;
      created_at?: unknown;
    }[];
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

export type GetTicketDetailQueryBoundaryZtdCase = QuerySpecZtdCase<
  GetTicketDetailBeforeDb,
  GetTicketDetailQueryParams,
  GetTicketDetailQueryResult[]
>;

// Add cases only for SQL behavior that static and PostgreSQL-derived contracts cannot prove.
