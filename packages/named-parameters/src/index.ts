/** Build-time-lowered driver SQL and its value ordering. */
export type PreparedNamedSql = {
  sql: string;
  orderedNames: readonly string[];
};

export type BindNamedParametersOptions = {
  strict?: boolean;
  /**
   * Names deliberately removed from the effective statement by a verified
   * higher-level rewrite. This does not relax missing-value checks.
   */
  allowedUnusedNames?: ReadonlySet<string>;
};

export class NamedParameterError extends Error {
  readonly code: 'ASHIBA_MISSING_PARAMETER' | 'ASHIBA_UNUSED_PARAMETER';
  readonly parameterNames: readonly string[];

  constructor(code: NamedParameterError['code'], parameterNames: readonly string[]) {
    const label = code === 'ASHIBA_MISSING_PARAMETER' ? 'Missing' : 'Unused';
    super(`${label} SQL parameter${parameterNames.length === 1 ? '' : 's'}: ${parameterNames.join(', ')}`);
    this.name = 'NamedParameterError';
    this.code = code;
    this.parameterNames = parameterNames;
  }
}

/**
 * Binds values to build-time-lowered driver SQL without rewriting SQL text.
 * Applications pass the returned SQL and values directly to their native driver.
 */
export function bindNamedParameters(
  statement: PreparedNamedSql,
  params: Readonly<Record<string, unknown>>,
  options: BindNamedParametersOptions = {},
): PreparedNamedSql & { values: readonly unknown[] } {
  const names = new Set(statement.orderedNames);
  const missing = [...names].filter((name) => !Object.hasOwn(params, name));
  if (missing.length > 0) throw new NamedParameterError('ASHIBA_MISSING_PARAMETER', missing);

  if (options.strict) {
    const unused = Object.keys(params).filter((name) => !names.has(name) && !options.allowedUnusedNames?.has(name));
    if (unused.length > 0) throw new NamedParameterError('ASHIBA_UNUSED_PARAMETER', unused);
  }

  return { ...statement, values: statement.orderedNames.map((name) => params[name]) };
}
