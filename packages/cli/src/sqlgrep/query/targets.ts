import type { QueryUsageMode, QueryUsageTarget, QueryUsageTargetKind } from './types.js';
import { invalidCliInputError } from '../../errors.js';

export interface ParsedQueryTarget {
  mode: QueryUsageMode;
  target: QueryUsageTarget;
}

/**
 * Parse strict-first query targets and reject implicit broadening.
 */
export function parseQueryTarget(params: {
  kind: QueryUsageTargetKind;
  raw: string;
  anySchema?: boolean;
  anyTable?: boolean;
}): ParsedQueryTarget {
  const raw = params.raw.trim();
  if (!raw) {
    throw invalidCliInputError(
      'ASHIBA_QUERY_TARGET_REQUIRED',
      `Target must be a non-empty ${params.kind} selector.`,
      'Pass a concrete query usage target, such as public.users or public.users.user_id.',
      { kind: params.kind },
    );
  }
  if (params.anyTable && !params.anySchema) {
    throw invalidCliInputError(
      'ASHIBA_QUERY_TARGET_ANY_TABLE_REQUIRES_ANY_SCHEMA',
      '--any-table requires --any-schema.',
      'Pass --any-schema together with --any-table, or remove --any-table.',
    );
  }

  const parts = raw.split('.').map((segment) => segment.trim()).filter(Boolean);
  if (params.kind === 'table') {
    return parseTableTarget(parts, raw, Boolean(params.anySchema), Boolean(params.anyTable));
  }
  return parseColumnTarget(parts, raw, Boolean(params.anySchema), Boolean(params.anyTable));
}

function parseTableTarget(parts: string[], raw: string, anySchema: boolean, anyTable: boolean): ParsedQueryTarget {
  if (anyTable) {
    throw invalidCliInputError(
      'ASHIBA_QUERY_TABLE_TARGET_ANY_TABLE_UNSUPPORTED',
      '--any-table is not supported for table usage.',
      'Use an exact table target, or pass --any-schema with a table name.',
      { raw },
    );
  }
  if (parts.length === 2) {
    return {
      mode: 'exact',
      target: {
        kind: 'table',
        raw,
        schema: parts[0],
        table: parts[1]
      }
    };
  }
  if (parts.length === 1 && anySchema) {
    return {
      mode: 'any-schema',
      target: {
        kind: 'table',
        raw,
        table: parts[0]
      }
    };
  }
  throw invalidCliInputError(
    'ASHIBA_QUERY_TABLE_TARGET_INVALID',
    'Table usage requires <schema.table> unless --any-schema is explicitly provided.',
    'Pass schema.table, or pass --any-schema with a table name.',
    { raw, anySchema },
  );
}

function parseColumnTarget(parts: string[], raw: string, anySchema: boolean, anyTable: boolean): ParsedQueryTarget {
  if (parts.length === 3) {
    return {
      mode: 'exact',
      target: {
        kind: 'column',
        raw,
        schema: parts[0],
        table: parts[1],
        column: parts[2]
      }
    };
  }
  if (parts.length === 2 && anySchema && !anyTable) {
    return {
      mode: 'any-schema',
      target: {
        kind: 'column',
        raw,
        table: parts[0],
        column: parts[1]
      }
    };
  }
  if (parts.length === 1 && anySchema && anyTable) {
    return {
      mode: 'any-schema-any-table',
      target: {
        kind: 'column',
        raw,
        column: parts[0]
      }
    };
  }
  throw invalidCliInputError(
    'ASHIBA_QUERY_COLUMN_TARGET_INVALID',
    'Column usage requires <schema.table.column> by default. Use --any-schema for <table.column> or --any-schema --any-table for <column>.',
    'Pass schema.table.column, or explicitly choose --any-schema / --any-table for a broader search.',
    { raw, anySchema, anyTable },
  );
}
