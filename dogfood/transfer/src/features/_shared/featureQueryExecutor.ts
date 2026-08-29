import type { FeatureQueryModel } from '@ashiba-ts/driver-adapter-core';

export interface FeatureQuerySource<Params extends object = Record<string, unknown>, Row = unknown> {
  readonly __transferContract?: {
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

export interface FeatureQueryExecutor<Query extends AnyFeatureQuerySource = AnyFeatureQuerySource> {
  query(query: Query, params: AshibaQueryParams<Query>): Promise<AshibaQueryRow<Query>[]>;
  transaction?<T>(operation: (executor: FeatureQueryExecutor) => Promise<T>): Promise<T>;
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
  if (rows.length !== 1) throw new Error(`${query.id} expected one row, got ${rows.length}.`);
  return rows[0];
}

export async function queryOneOrNull<Query extends AnyFeatureQuerySource>(
  executor: FeatureQueryExecutor<Query>, query: Query, params: AshibaQueryParams<Query>,
): Promise<AshibaQueryRow<Query> | null> {
  const rows = await queryMany(executor, query, params);
  if (rows.length > 1) throw new Error(`${query.id} expected at most one row, got ${rows.length}.`);
  return rows[0] ?? null;
}
