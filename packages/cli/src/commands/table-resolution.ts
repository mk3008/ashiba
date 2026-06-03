import {
  BinarySelectQuery,
  DeleteQuery,
  InsertQuery,
  SimpleSelectQuery,
  TableSource,
  UpdateQuery,
  type CommonTable,
  type SelectQuery,
  type SourceExpression,
  type SqlParser,
} from 'rawsql-ts';
import {
  normalizeIdentifier,
  parseQualifiedTableName,
  resolveSchemaPathTable,
  type SchemaPathConfig,
  type SchemaPathTable,
  type SchemaPathTableModel,
} from './schema-path.js';

export interface TableReference {
  schema?: string;
  table: string;
  alias: string;
}

export interface TableTarget {
  schema?: string;
  table: string;
}

/**
 * Resolves a parsed SQL table target through the configured schema search path.
 */
export function resolveDdlTable<T extends SchemaPathTable>(
  model: SchemaPathTableModel<T>,
  target: TableTarget,
  schemaPath: Partial<SchemaPathConfig>,
): T | undefined {
  return resolveSchemaPathTable(model, target.schema ? `${target.schema}.${target.table}` : target.table, schemaPath);
}

/**
 * Collects table references from a parsed SQL statement while ignoring CTE aliases as physical tables.
 */
export function collectTableReferences(query: ReturnType<typeof SqlParser.parse>): TableReference[] {
  const references: TableReference[] = [];
  const addSource = (source: SourceExpression | null | undefined) => {
    if (!source || !(source.datasource instanceof TableSource)) return;
    const { schema, table } = parseQualifiedTableName(source.datasource.qualifiedName.toString());
    references.push({ schema, table, alias: normalizeIdentifier(source.getAliasName() ?? table) });
  };
  const addCtes = (ctes: CommonTable[] | null | undefined) => {
    for (const cte of ctes ?? []) collectFromQuery(cte.query);
  };
  const collectSelect = (selectQuery: SelectQuery) => {
    if (selectQuery instanceof SimpleSelectQuery) {
      addCtes(selectQuery.withClause?.tables);
      const cteNames = new Set((selectQuery.withClause?.tables ?? []).map((cte) => cte.getSourceAliasName().toLowerCase()));
      for (const source of selectQuery.fromClause?.getSources() ?? []) {
        if (source.datasource instanceof TableSource && cteNames.has(source.datasource.table.name.toLowerCase())) continue;
        addSource(source);
      }
    } else if (selectQuery instanceof BinarySelectQuery) {
      collectSelect(selectQuery.left);
      collectSelect(selectQuery.right);
    }
  };
  const collectFromQuery = (value: ReturnType<typeof SqlParser.parse> | SelectQuery) => {
    if (value instanceof SimpleSelectQuery || value instanceof BinarySelectQuery) {
      collectSelect(value);
    } else if (value instanceof InsertQuery) {
      addSource(value.insertClause.source);
    } else if (value instanceof UpdateQuery) {
      addCtes(value.withClause?.tables);
      addSource(value.updateClause.source);
      for (const source of value.fromClause?.getSources() ?? []) addSource(source);
    } else if (value instanceof DeleteQuery) {
      addCtes(value.withClause?.tables);
      addSource(value.deleteClause.source);
      for (const source of value.usingClause?.getSources() ?? []) addSource(source);
    }
  };
  collectFromQuery(query);
  return references;
}

/**
 * Extracts a schema-aware table target from a rawsql-ts source expression.
 */
export function tableTargetFromSource(source: SourceExpression | null | undefined): TableTarget | undefined {
  if (!source || !(source.datasource instanceof TableSource)) return undefined;
  return parseQualifiedTableName(source.datasource.qualifiedName.toString());
}
