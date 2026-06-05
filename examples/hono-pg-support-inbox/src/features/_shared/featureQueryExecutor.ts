export type FeatureQueryModel = {
  analysis: {
    astParse: 'ok';
    statementKind: 'select' | 'insert' | 'update' | 'delete' | 'unknown';
    rootQueryShape?: 'simple-select' | 'compound-select' | 'values' | 'non-select' | 'unknown';
    hasTopLevelOrderBy: boolean;
    sourceHash?: string;
    resultColumnTypes?: Record<string, string>;
    parameterTypes?: Record<string, string>;
  };
  bindings?: {
    postgres?: { sourceHash?: string; sql: string; orderedNames: readonly string[] };
  };
};

export interface FeatureQuerySource {
  id: string;
  path: string;
  sqlPath: string;
  sql: string;
  queryModel: FeatureQueryModel;
  optionalConditionCompression?: boolean;
  metadata?: {
    sqlId?: string;
    queryId?: string;
    sqlFile?: string;
    sqlPath?: string;
    dialect?: string;
  };
}

export interface FeatureQueryExecutor {
  query<T = unknown>(query: FeatureQuerySource, params: Record<string, unknown>): Promise<T[]>;
}
