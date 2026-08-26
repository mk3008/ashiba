/** Build-time binding metadata. `original` is a formatter concern, not a driver binding style. */
export type ParameterBinding =
  | { style: 'indexed'; sql: string; parameterNames: readonly string[] }
  | { style: 'named'; sql: string; parameterNames: readonly string[] }
  | { style: 'anonymous'; sql: string; valueNames: readonly string[] };
export type BoundParameters = ParameterBinding & { values: readonly unknown[] };
export type BindNamedParametersOptions = { allowUnusedParameters?: boolean; allowedUnusedNames?: ReadonlySet<string> };
export class NamedParameterError extends Error {
  readonly code: 'ASHIBA_MISSING_PARAMETER' | 'ASHIBA_UNUSED_PARAMETER'; readonly parameterNames: readonly string[];
  constructor(code: NamedParameterError['code'], parameterNames: readonly string[]) { super(`${code === 'ASHIBA_MISSING_PARAMETER' ? 'Missing' : 'Unused'} SQL parameter${parameterNames.length === 1 ? '' : 's'}: ${parameterNames.join(', ')}`); this.name = 'NamedParameterError'; this.code = code; this.parameterNames = parameterNames; }
}
export function bindingParameterNames(statement: ParameterBinding): readonly string[] { return statement.style === 'anonymous' ? statement.valueNames : statement.parameterNames; }
/** Binds generated metadata only; SQL text is never parsed or rewritten at runtime. */
export function bindNamedParameters(statement: ParameterBinding, params: Readonly<Record<string, unknown>>, options: BindNamedParametersOptions = {}): BoundParameters {
  const names = bindingParameterNames(statement); const unique = [...new Set(names)]; const missing = unique.filter((name) => !Object.hasOwn(params, name));
  if (missing.length) throw new NamedParameterError('ASHIBA_MISSING_PARAMETER', missing);
  if (!options.allowUnusedParameters) { const unused = Object.keys(params).filter((name) => !unique.includes(name) && !options.allowedUnusedNames?.has(name)); if (unused.length) throw new NamedParameterError('ASHIBA_UNUSED_PARAMETER', unused); }
  return { ...statement, values: names.map((name) => params[name]) };
}
