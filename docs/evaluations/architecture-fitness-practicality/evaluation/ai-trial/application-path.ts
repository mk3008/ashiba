import { bindNamedParameters } from '@ashiba-ts/named-parameters';
import { bindingMetadata } from './list-customer-orders.bindings.js';

export interface ListCustomerOrdersParams {
  store_id: number;
  status: string | null;
  created_after: Date;
  limit: number;
}

export interface ListCustomerOrderRow {
  order_id: number;
  created_at: Date;
  customer_name: string;
  status: string;
  total_cents: number;
}

export async function listCustomerOrders(
  pool: { query(sql: string, values: readonly unknown[]): Promise<{ rows: ListCustomerOrderRow[] }> },
  params: ListCustomerOrdersParams,
): Promise<ListCustomerOrderRow[]> {
  const bound = bindNamedParameters(bindingMetadata.bindings.postgres, params);
  const result = await pool.query(bound.sql, bound.values);
  return result.rows;
}
