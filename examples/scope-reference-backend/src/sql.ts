/** A sample-local named-value preparer, intentionally not a general SQL builder. */
export function prepareNamedSql(sql: string, params: Record<string, unknown>): { sql: string; values: unknown[] } {
  const names: string[] = [];
  const prepared = sql.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_match, name: string) => {
    if (!(name in params)) throw new Error(`Missing SQL parameter: ${name}`);
    names.push(name);
    return `$${names.length}`;
  });
  return { sql: prepared, values: names.map((name) => params[name]) };
}
