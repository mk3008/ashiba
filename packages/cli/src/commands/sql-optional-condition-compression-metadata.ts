import {
  collectSupportedOptionalConditionBranchSpans,
  type OptionalConditionSourceRange,
  type SupportedOptionalConditionBranchKind,
} from 'rawsql-ts';

export type { OptionalConditionSourceRange };

export interface SqlOptionalConditionCompressionBranch {
  parameterName: string;
  kind: SupportedOptionalConditionBranchKind;
  sourceRange: OptionalConditionSourceRange;
  removalRange: OptionalConditionSourceRange;
}

export interface SqlOptionalConditionCompressionMetadata {
  enabled: true;
  branches: SqlOptionalConditionCompressionBranch[];
}

/**
 * Builds optional condition compression metadata from the rawsql-ts AST-backed span collector.
 */
export function buildSqlOptionalConditionCompressionMetadata(sql: string): SqlOptionalConditionCompressionMetadata {
  return {
    enabled: true,
    branches: collectSupportedOptionalConditionBranchSpans(sql),
  };
}
