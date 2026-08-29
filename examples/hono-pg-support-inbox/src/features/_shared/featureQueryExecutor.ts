import type { FeatureQueryModel } from '@ashiba-ts/driver-adapter-core';

/** Application-owned typed SQL boundary for Support Inbox. */
export interface FeatureQuerySource<Params extends object = Record<string, unknown>, Row = unknown> {
  readonly __supportInboxContract?: {
    readonly params: (value: Params) => Params;
    readonly row: (value: Row) => Row;
  };
  id: string;
  path: string;
  sqlPath?: string;
  sql: string;
  queryModel: FeatureQueryModel;
  optionalConditionCompression?: boolean;
  metadata?: Record<string, unknown>;
}

export type AnyFeatureQuerySource = FeatureQuerySource<any, any>;
export type AshibaQueryParams<Query> = Query extends FeatureQuerySource<infer Params, infer _Row> ? Params : never;
export type AshibaQueryRow<Query> = Query extends FeatureQuerySource<infer _Params, infer Row> ? Row : never;

/** Application-owned execution seam; native pg is called by its pool module. */
export interface FeatureQueryExecutor<Query extends AnyFeatureQuerySource = AnyFeatureQuerySource> {
  query(query: Query, params: AshibaQueryParams<Query>): Promise<AshibaQueryRow<Query>[]>;
}

export class FeatureQueryCardinalityError extends Error {
  constructor(
    readonly code: 'SUPPORT_INBOX_QUERY_EXPECTED_ONE_ROW' | 'SUPPORT_INBOX_QUERY_EXPECTED_ZERO_OR_ONE_ROW',
    query: FeatureQuerySource,
    readonly rowCount: number,
  ) {
    super(`${query.id} query cardinality was ${rowCount}.`);
    this.name = 'FeatureQueryCardinalityError';
  }
}

export async function queryMany<Query extends AnyFeatureQuerySource>(
  executor: FeatureQueryExecutor<Query>, query: Query, params: AshibaQueryParams<Query>,
): Promise<AshibaQueryRow<Query>[]> {
  return executor.query(query, params);
}

export async function queryOne<Query extends AnyFeatureQuerySource>(
  executor: FeatureQueryExecutor<Query>, query: Query, params: AshibaQueryParams<Query>,
): Promise<AshibaQueryRow<Query>> {
  const rows = await queryMany(executor, query, params);
  if (rows.length !== 1) throw new FeatureQueryCardinalityError('SUPPORT_INBOX_QUERY_EXPECTED_ONE_ROW', query, rows.length);
  return rows[0];
}

export async function queryOneOrNull<Query extends AnyFeatureQuerySource>(
  executor: FeatureQueryExecutor<Query>, query: Query, params: AshibaQueryParams<Query>,
): Promise<AshibaQueryRow<Query> | null> {
  const rows = await queryMany(executor, query, params);
  if (rows.length > 1) throw new FeatureQueryCardinalityError('SUPPORT_INBOX_QUERY_EXPECTED_ZERO_OR_ONE_ROW', query, rows.length);
  return rows[0] ?? null;
}
