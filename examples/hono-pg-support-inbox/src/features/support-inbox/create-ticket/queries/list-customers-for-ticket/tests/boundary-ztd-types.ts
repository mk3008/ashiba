import type { QuerySpecZtdCase } from '#tests/support/ztd/case-types.js';
import type { ListCustomersForTicketQueryParams, ListCustomersForTicketQueryResult } from '../query.js';

export type ListCustomersForTicketBeforeDb = {
  public: {
    customers: readonly {
      customer_id?: unknown;
      name?: unknown;
      tier?: unknown;
      locale?: unknown;
      created_at?: unknown;
    }[];
  };
};

export type ListCustomersForTicketQueryBoundaryZtdCase = QuerySpecZtdCase<
  ListCustomersForTicketBeforeDb,
  ListCustomersForTicketQueryParams,
  ListCustomersForTicketQueryResult[]
>;

export type ListCustomersForTicketQueryMappingZtdCase = QuerySpecZtdCase<
  ListCustomersForTicketBeforeDb,
  ListCustomersForTicketQueryParams,
  ListCustomersForTicketQueryResult[]
>;
