import { queryMany } from '@ashiba-ts/driver-adapter-core';
import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { queryModel } from './generated/query.meta.js';
import { querySql } from './generated/query.sql.js';

export const resolveTransferDestinationDefinitionsSql = querySql;
export const resolveTransferDestinationDefinitionsQuery = {
  id: 'resolve-transfer-destination-definitions',
  path: 'resolve-transfer-destination-definitions.sql',
  sqlPath: 'resolve-transfer-destination-definitions.sql',
  sql: resolveTransferDestinationDefinitionsSql,
  queryModel,
  optionalConditionCompression: true,
  metadata: {
    sqlId: 'resolve-transfer-destination-definitions',
    queryId: 'resolve-transfer-destination-definitions',
    sqlFile: 'resolve-transfer-destination-definitions.sql',
    sqlPath: 'resolve-transfer-destination-definitions.sql',
  },
} as const;

export interface ResolveTransferDestinationDefinitionsQueryParams {
  destination_definition_names: unknown;
}

export interface ResolveTransferDestinationDefinitionsQueryResult {
  destination_definition_id: string | null;
  destination_definition_name: string | null;
}

type QueryRow = ResolveTransferDestinationDefinitionsQueryResult;

export async function executeResolveTransferDestinationDefinitionsQuery(
  executor: FeatureQueryExecutor,
  params: ResolveTransferDestinationDefinitionsQueryParams
): Promise<ResolveTransferDestinationDefinitionsQueryResult[]> {
  return queryMany<QueryRow>(executor, resolveTransferDestinationDefinitionsQuery, params as unknown as Record<string, unknown>);
}
