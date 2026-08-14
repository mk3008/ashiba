export {
  FeatureQueryCardinalityError,
  queryMany,
  queryOne,
  queryOneOrNull,
  type FeatureQueryModel,
  type FeatureQuerySource,
  type AnyFeatureQuerySource,
  type AshibaQueryParams,
  type AshibaQueryRow,
} from '@ashiba-ts/driver-adapter-core';

import type {
  AnyFeatureQuerySource,
  FeatureQueryExecutor as CoreFeatureQueryExecutor,
} from '@ashiba-ts/driver-adapter-core';

export interface FeatureQueryExecutor<Query extends AnyFeatureQuerySource = AnyFeatureQuerySource>
  extends CoreFeatureQueryExecutor<Query> {
  transaction?<T>(operation: (executor: FeatureQueryExecutor) => Promise<T>): Promise<T>;
}
