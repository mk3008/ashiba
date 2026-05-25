import {
  AlterTableAddConstraint,
  AlterTableDropColumn,
  AlterTableDropConstraint,
  AlterTableStatement,
  CreateIndexStatement,
  CreateTableQuery,
  DropTableStatement,
  MultiQuerySplitter,
  SqlParser,
  type ParsedStatement,
  type QualifiedName,
} from 'rawsql-ts';
import type {
  ApplyPlanOperation,
  DdlApplyPlan,
  DdlDiffRisks,
  DdlDiffSummaryEntry,
  DestructiveRisk,
  OperationalRisk,
} from './contracts.js';
import { AshibaDdlDiffError } from './errors.js';

export function analyzeMigrationPlanRisks(plan: DdlApplyPlan, summary: DdlDiffSummaryEntry[] = []): DdlDiffRisks {
  const destructiveRisks: DestructiveRisk[] = [];
  const operationalRisks: OperationalRisk[] = [];
  const summaryByTable = groupSummaryByTable(summary);
  const rebuiltTables = new Set(
    plan.operations
      .filter((operation) => operation.kind === 'recreate_table')
      .map((operation) => operation.target)
      .filter((target): target is string => Boolean(target))
  );

  for (const operation of plan.operations) {
    switch (operation.kind) {
      case 'drop_table_cascade':
        if (operation.target) {
          destructiveRisks.push(createGuidedRisk('drop_table', operation.target));
          destructiveRisks.push(createGuidedRisk('cascade_drop', operation.target));
        }
        break;
      case 'drop_column_effect':
        if (operation.target) {
          destructiveRisks.push(createGuidedRisk('drop_column', operation.target));
        }
        break;
      case 'alter_type_effect':
        if (operation.target) {
          destructiveRisks.push(createDestructiveRisk('alter_type', operation.target));
        }
        break;
      case 'nullability_tighten_effect':
        if (operation.target) {
          destructiveRisks.push(createDestructiveRisk('nullability_tighten', operation.target));
        }
        break;
      case 'rename_candidate_effect':
        destructiveRisks.push(createDestructiveRisk('rename_candidate', undefined, operation.from, operation.to));
        break;
      case 'semantic_constraint_change_effect':
        if (operation.target) {
          destructiveRisks.push(createDestructiveRisk('semantic_constraint_change', operation.target));
        }
        break;
      case 'recreate_table':
        if (operation.target) {
          operationalRisks.push({ kind: 'table_rebuild', target: operation.target });
          operationalRisks.push({ kind: 'full_table_copy', target: operation.target });
        }
        break;
      case 'index_rebuild_effect':
        if (operation.target) {
          operationalRisks.push({ kind: 'index_rebuild', target: operation.target });
        }
        break;
    }
  }

  // Preserve summary-aware rename and typed column signals that are not recoverable from plan operations alone.
  for (const [tableKey, entries] of summaryByTable.entries()) {
    for (const candidate of findRenameCandidates(entries)) {
      destructiveRisks.push(createDestructiveRisk('rename_candidate', undefined, candidate.from, candidate.to));
    }

    if (!rebuiltTables.has(tableKey)) {
      continue;
    }

    for (const entry of entries.filter((item) => item.changeKind === 'alter_type')) {
      destructiveRisks.push(createDestructiveRisk('alter_type', `${tableKey}.${String(entry.details.column)}`));
    }
  }

  return {
    destructiveRisks: dedupeDestructiveRisks(destructiveRisks),
    operationalRisks: dedupeOperationalRisks(operationalRisks)
  };
}

export function analyzeMigrationSqlRisks(sql: string): DdlDiffRisks {
  const destructiveRisks: DestructiveRisk[] = [];
  const operationalRisks: OperationalRisk[] = [];
  const droppedTables = new Set<string>();
  const createdTables = new Set<string>();
  const rebuiltTables = new Set<string>();
  const createTablesWithConstraints = new Set<string>();
  const alteredConstraintTables = new Set<string>();

  for (const statement of parseMigrationStatements(sql)) {
    if (statement instanceof DropTableStatement) {
      for (const tableName of statement.tables) {
        const table = normalizeQualifiedTarget(tableName);
        destructiveRisks.push(createGuidedRisk('drop_table', table));
        if (statement.behavior === 'cascade') {
          destructiveRisks.push(createGuidedRisk('cascade_drop', table));
        }
        droppedTables.add(table);
      }
      continue;
    }

    if (statement instanceof CreateTableQuery) {
      const table = normalizeQualifiedTarget(statement);
      createdTables.add(table);
      if (hasConstraintLikeClause(statement)) {
        createTablesWithConstraints.add(table);
      }
      continue;
    }

    if (statement instanceof AlterTableStatement) {
      const table = normalizeQualifiedTarget(statement.table);
      for (const action of statement.actions) {
        if (action instanceof AlterTableDropColumn) {
          destructiveRisks.push(createGuidedRisk('drop_column', `${table}.${normalizeIdentifier(action.columnName.name)}`));
          continue;
        }
        if (action instanceof AlterTableAddConstraint || action instanceof AlterTableDropConstraint) {
          alteredConstraintTables.add(table);
          destructiveRisks.push(createDestructiveRisk('semantic_constraint_change', table));
        }
      }
      continue;
    }

    if (statement instanceof CreateIndexStatement) {
      const indexName = normalizeQualifiedTarget(statement.indexName);
      const tableTarget = normalizeQualifiedTarget(statement.tableName);
      if (droppedTables.has(tableTarget)) {
        operationalRisks.push({ kind: 'index_rebuild', target: indexName });
      }
    }
  }

  for (const table of droppedTables) {
    if (createdTables.has(table)) {
      rebuiltTables.add(table);
    }
  }

  for (const table of rebuiltTables) {
    operationalRisks.push({ kind: 'table_rebuild', target: table });
    operationalRisks.push({ kind: 'full_table_copy', target: table });

    if (createTablesWithConstraints.has(table) || alteredConstraintTables.has(table)) {
      destructiveRisks.push(createDestructiveRisk('semantic_constraint_change', table));
    }
  }

  return {
    destructiveRisks: dedupeDestructiveRisks(destructiveRisks),
    operationalRisks: dedupeOperationalRisks(operationalRisks)
  };
}

function parseMigrationStatements(sql: string): ParsedStatement[] {
  const statements: ParsedStatement[] = [];
  for (const query of MultiQuerySplitter.split(sql).getNonEmpty()) {
    try {
      statements.push(SqlParser.parse(query.sql));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new AshibaDdlDiffError({
        code: 'ASHIBA_DDL_RISK_AST_PARSE_FAILED',
        message: 'DDL AST parse failed while analyzing migration SQL risks.',
        operation: 'analyzing migration SQL risks',
        reason,
      });
    }
  }
  return statements;
}


function createGuidedRisk(kind: 'drop_table' | 'drop_column' | 'cascade_drop', target: string): DestructiveRisk {
  return {
    kind,
    target,
    avoidable: true,
    guidance: ['review_if_required', 'avoid_if_possible', 'cli_option_not_exposed']
  };
}

function createDestructiveRisk(
  kind: Exclude<DestructiveRisk['kind'], 'drop_table' | 'drop_column' | 'cascade_drop'>,
  target?: string,
  from?: string,
  to?: string
): DestructiveRisk {
  return {
    kind,
    target,
    from,
    to,
    guidance: ['review_if_required']
  };
}

function dedupeDestructiveRisks(risks: DestructiveRisk[]): DestructiveRisk[] {
  const seen = new Map<string, DestructiveRisk>();
  for (const risk of risks) {
    const key = JSON.stringify({
      kind: risk.kind,
      target: risk.target ?? '',
      from: risk.from ?? '',
      to: risk.to ?? ''
    });
    if (!seen.has(key)) {
      seen.set(key, risk);
    }
  }

  return [...seen.values()].sort((left, right) => {
    const leftKey = `${left.kind}:${left.target ?? left.from ?? ''}:${left.to ?? ''}`;
    const rightKey = `${right.kind}:${right.target ?? right.from ?? ''}:${right.to ?? ''}`;
    return leftKey.localeCompare(rightKey);
  });
}

function dedupeOperationalRisks(risks: OperationalRisk[]): OperationalRisk[] {
  const seen = new Map<string, OperationalRisk>();
  for (const risk of risks) {
    const key = `${risk.kind}:${risk.target}`;
    if (!seen.has(key)) {
      seen.set(key, risk);
    }
  }

  return [...seen.values()].sort((left, right) => {
    const leftKey = `${left.kind}:${left.target}`;
    const rightKey = `${right.kind}:${right.target}`;
    return leftKey.localeCompare(rightKey);
  });
}

function groupSummaryByTable(summary: DdlDiffSummaryEntry[]): Map<string, DdlDiffSummaryEntry[]> {
  const grouped = new Map<string, DdlDiffSummaryEntry[]>();
  for (const entry of summary) {
    const key = `${entry.schema}.${entry.table}`;
    const bucket = grouped.get(key) ?? [];
    bucket.push(entry);
    grouped.set(key, bucket);
  }
  return grouped;
}

function findRenameCandidates(entries: DdlDiffSummaryEntry[]): Array<{ from: string; to: string }> {
  const addedColumns = entries.filter((entry) => entry.changeKind === 'add_column');
  const droppedColumns = entries.filter((entry) => entry.changeKind === 'drop_column');
  const candidates: Array<{ from: string; to: string }> = [];

  for (const dropped of droppedColumns) {
    const matched = addedColumns.find((entry) => normalizeSql(String(entry.details.type)) === normalizeSql(String(dropped.details.type)));
    if (!matched) {
      continue;
    }

    const tableKey = `${dropped.schema}.${dropped.table}`;
    candidates.push({
      from: `${tableKey}.${String(dropped.details.column)}`,
      to: `${tableKey}.${String(matched.details.column)}`
    });
  }

  return candidates;
}

function normalizeQualifiedTarget(value: QualifiedName | CreateTableQuery): string {
  if (value instanceof CreateTableQuery) {
    const schema = value.namespaces?.[0] ? normalizeIdentifier(value.namespaces[0]) : 'public';
    return `${schema}.${normalizeIdentifier(value.tableName.name)}`;
  }
  const namespaces = value.namespaces?.map((namespace) => normalizeIdentifier(namespace.name)) ?? [];
  const name = 'name' in value.name && typeof value.name.name === 'string'
    ? value.name.name
    : 'value' in value.name && typeof value.name.value === 'string'
      ? value.name.value
      : String(value.name);
  if (namespaces.length === 0) {
    return `public.${normalizeIdentifier(name)}`;
  }
  return `${namespaces.map(normalizeIdentifier).join('.')}.${normalizeIdentifier(name)}`;
}

function normalizeIdentifier(value: string): string {
  return value.replace(/^"/, '').replace(/"$/, '');
}

function normalizeSql(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function hasConstraintLikeClause(statement: CreateTableQuery): boolean {
  return statement.tableConstraints.length > 0
    || statement.columns.some((column) => column.constraints.length > 0);
}

// Re-exporting the shape keeps future SQL re-evaluation entrypoints on the same contract.
export type { DdlDiffRisks, DdlApplyPlan, DdlDiffSummaryEntry } from './contracts.js';
