export {
  FeatureQueryCardinalityError,
  queryMany,
  queryOne,
  queryOneOrNull,
  type FeatureQueryModel,
  type FeatureQuerySource,
} from '@ashiba-ts/driver-adapter-core';

import type { FeatureQueryExecutor as CoreFeatureQueryExecutor } from '@ashiba-ts/driver-adapter-core';

export interface FeatureQueryExecutor extends CoreFeatureQueryExecutor {
  transaction?<T>(operation: (executor: FeatureQueryExecutor) => Promise<T>): Promise<T>;
}
