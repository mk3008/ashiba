import type { QuerySpecZtdCase } from '#tests/support/ztd/case-types.js';
import type { CreateTicketMessageQueryParams, CreateTicketMessageQueryResult } from '../query.js';

export type CreateTicketMessageBeforeDb = {
  public: {
    ticket_messages: readonly {
      message_id?: unknown;
      ticket_id?: unknown;
      sender_name?: unknown;
      sender_role?: unknown;
      body?: unknown;
      created_at?: unknown;
    }[];
  };
};

export type CreateTicketMessageQueryBoundaryZtdCase = QuerySpecZtdCase<
  CreateTicketMessageBeforeDb,
  CreateTicketMessageQueryParams,
  CreateTicketMessageQueryResult
>;

export type CreateTicketMessageQueryMappingZtdCase = QuerySpecZtdCase<
  CreateTicketMessageBeforeDb,
  CreateTicketMessageQueryParams,
  CreateTicketMessageQueryResult
>;
