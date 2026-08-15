import {
  queryMany,
  queryOne,
  type FeatureQueryExecutor,
  type FeatureQuerySource,
} from '../src/index.js';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2) ? true : false;
type Assert<Value extends true> = Value;

interface SearchParams {
  limit: number;
  tags: string[];
}

interface SearchRow {
  id: number;
  tags: string[] | null;
}

declare const source: FeatureQuerySource<SearchParams, SearchRow>;
declare const executor: FeatureQueryExecutor<typeof source>;
declare const forgedSource: FeatureQuerySource<SearchParams, { forged: true }>;

const many = queryMany(executor, source, { limit: 10, tags: ['safe'] });
const one = queryOne(executor, source, { limit: 1, tags: [] });

type _ManyUsesSourceRow = Assert<Equal<Awaited<typeof many>, SearchRow[]>>;
type _OneUsesSourceRow = Assert<Equal<Awaited<typeof one>, SearchRow>>;

// @ts-expect-error Params are taken from the source contract.
queryMany(executor, source, { limit: '10', tags: ['safe'] });

// @ts-expect-error The helper generic is the query source, not a caller-selected result row.
queryMany<{ forged: true }>(executor, source, { limit: 10, tags: [] });

// @ts-expect-error The executor is bound to the source's invariant Row contract.
executor.query(forgedSource, { limit: 10, tags: [] });

void many;
void one;
