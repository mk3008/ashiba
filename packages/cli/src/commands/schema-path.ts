export interface SchemaPathConfig {
  defaultSchema: string;
  searchPath: string[];
}

export interface SchemaPathTable {
  schema: string;
  name: string;
  canonicalName: string;
}

export interface SchemaPathTableModel<T extends SchemaPathTable> {
  tables: Map<string, T>;
}

/**
 * Normalizes the project schema lookup settings used for SQL and DDL table resolution.
 */
export function normalizeSchemaPathConfig(config?: Partial<SchemaPathConfig>): SchemaPathConfig {
  const defaultSchema = normalizeIdentifier(config?.defaultSchema ?? 'public') || 'public';
  const searchPath = (config?.searchPath ?? [])
    .map((entry) => normalizeIdentifier(entry))
    .filter((entry) => entry.length > 0);
  return {
    defaultSchema,
    searchPath: searchPath.length > 0 ? searchPath : [defaultSchema],
  };
}

/**
 * Resolves a possibly unqualified table name through the configured schema search path.
 */
export function resolveSchemaPathTable<T extends SchemaPathTable>(
  model: SchemaPathTableModel<T>,
  rawTableName: string,
  config?: Partial<SchemaPathConfig>,
): T | undefined {
  const name = parseQualifiedTableName(rawTableName);
  if (!name.table) return undefined;
  if (name.schema) {
    return model.tables.get(`${name.schema}.${name.table}`.toLowerCase());
  }
  const schemaPath = normalizeSchemaPathConfig(config);
  for (const schema of schemaPath.searchPath) {
    const table = model.tables.get(`${schema}.${name.table}`.toLowerCase());
    if (table) return table;
  }
  return undefined;
}

/**
 * Splits a raw SQL table name into optional schema and table parts without treating quoted dots as separators.
 */
export function parseQualifiedTableName(rawTableName: string): { schema?: string; table: string } {
  const segments = splitUnquotedQualifiedSegments(rawTableName).map((segment) => normalizeIdentifier(segment));
  if (segments.length <= 1) {
    return { table: segments[0] ?? '' };
  }
  return {
    schema: segments[segments.length - 2],
    table: segments[segments.length - 1] ?? '',
  };
}

/**
 * Formats the effective schema search path for diagnostics.
 */
export function formatSearchPath(config?: Partial<SchemaPathConfig>): string {
  return normalizeSchemaPathConfig(config).searchPath.join(', ');
}

/**
 * Normalizes a SQL identifier for DDL-backed lookup.
 */
export function normalizeIdentifier(value: string): string {
  return value.trim().replace(/^"/, '').replace(/"$/, '');
}

function splitUnquotedQualifiedSegments(value: string): string[] {
  const parts: string[] = [];
  let current = '';
  let quoted = false;
  for (const char of value) {
    if (char === '"') {
      quoted = !quoted;
    }
    if (char === '.' && !quoted) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  parts.push(current);
  return parts;
}
