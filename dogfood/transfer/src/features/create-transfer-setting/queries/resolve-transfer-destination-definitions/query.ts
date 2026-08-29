import { queryMany, type FeatureQuerySource } from '#features/_shared/featureQueryExecutor.js';
import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { bindingMetadata } from './generated/query.meta.js';
import { querySql } from './generated/query.sql.js';

export const resolveTransferDestinationDefinitionsSql = querySql;
export const resolveTransferDestinationDefinitionsQuery: FeatureQuerySource<ResolveTransferDestinationDefinitionsQueryParams, ResolveTransferDestinationDefinitionsQueryResult> = {
  id: 'resolve-transfer-destination-definitions',
  path: 'resolve-transfer-destination-definitions.sql',
  sqlPath: 'resolve-transfer-destination-definitions.sql',
  sql: resolveTransferDestinationDefinitionsSql,
  binding: bindingMetadata.bindings.postgres,
  metadata: {
    sqlId: 'resolve-transfer-destination-definitions',
    queryId: 'resolve-transfer-destination-definitions',
    sqlFile: 'resolve-transfer-destination-definitions.sql',
    sqlPath: 'resolve-transfer-destination-definitions.sql',
  },
};

export interface ResolveTransferDestinationDefinitionsQueryParams {
  destination_definition_names: string[];
}

export interface ResolveTransferDestinationDefinitionsQueryResult {
  destination_definition_id: string;
  destination_definition_name: string;
}

export async function executeResolveTransferDestinationDefinitionsQuery(
  executor: FeatureQueryExecutor,
  params: ResolveTransferDestinationDefinitionsQueryParams
): Promise<ResolveTransferDestinationDefinitionsQueryResult[]> {
  return queryMany(executor, resolveTransferDestinationDefinitionsQuery, params);
}
