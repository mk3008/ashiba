import type { ListCustomersForTicketQueryResult } from './queries/list-customers-for-ticket/query.js';

export type TicketCustomerOption = {
  customer_id: string;
  name: string;
  tier: string;
  locale: string;
};

export interface ListTicketCustomerOptionsResponse {
  items: TicketCustomerOption[];
}

export function buildResult(result: ListCustomersForTicketQueryResult[]): ListTicketCustomerOptionsResponse {
  return {
    items: result.map((row) => ({
      customer_id: row.customer_id,
      name: row.name,
      tier: row.tier,
      locale: row.locale,
    })),
  };
}
