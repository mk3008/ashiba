import { readFileSync, rmSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { compareSqlResourceFleetSnapshots, compareSqlResourceSnapshotFiles } from '../../../../packages/cli/src/commands/sql-resource.js';
import { compileNamedParameters } from '../../../../packages/named-parameters/src/compiler.js';

type AnyRecord = Record<string, any>;

const scales = [20, 300, 3000] as const;
const changeKinds = [
  'formatting/comment-only', 'semantic predicate', 'parameter add', 'parameter remove',
  'result column add', 'result column remove', 'table change', 'column change',
  'query add', 'query remove',
] as const;

function hash(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function typeIdentity(name = 'int4'): AnyRecord {
  return { schema: 'pg_catalog', name, formattedName: name, kind: 'base', category: 'N' };
}

function field(name: string, position: number, type = 'int4'): AnyRecord {
  return {
    position, name, nameProvenance: 'proven', databaseType: typeIdentity(type),
    nullability: { value: 'non-null', provenance: 'inferred' },
  };
}

function driverField(name: string, position: number, type = 'number'): AnyRecord {
  return { position, name, runtimeType: type, typeScriptType: type, provenance: 'driver-mapped' };
}

function sqlFor(index: number, variant = 'base'): string {
  const extra = variant === 'semantic' ? "\n  AND t.status <> 'deleted'" : '';
  const comment = variant === 'comment' ? '\n-- review-only comment' : '';
  return `-- query ${index}\nWITH visible AS (\n  SELECT t.id, t.subject, t.status, u.name AS assignee_name\n  FROM support.tickets AS t\n  LEFT JOIN support.users AS u ON u.id = t.assignee_id\n  WHERE (:status IS NULL OR t.status = :status)\n    AND (:assignee IS NULL OR u.name = :assignee)${extra}\n)\nSELECT id, subject, status, assignee_name\nFROM visible\nWHERE id > :cursor\nORDER BY id\nLIMIT :limit;${comment}\n`;
}

function resource(index: number, sql: string, options: { parameterNames?: string[]; resultNames?: string[]; table?: string; column?: string } = {}): AnyRecord {
  const parameterNames = options.parameterNames ?? ['status', 'assignee', 'cursor', 'limit'];
  const resultNames = options.resultNames ?? ['id', 'subject', 'status', 'assignee_name'];
  const dependencies = [
    { kind: 'table', schema: 'support', name: options.table ?? 'tickets' },
    { kind: 'table', schema: 'support', name: 'users' },
    { kind: 'column', schema: 'support', name: options.table ?? 'tickets', column: options.column ?? 'status', columnType: typeIdentity('text') },
  ];
  return {
    version: 1, status: 'described', id: `ashiba:query:q-${index}`,
    canonical: { path: `queries/q-${index}.sql`, mediaType: 'application/sql', sourceHash: hash(sql), bytes: Buffer.byteLength(sql) },
    executable: { dialect: 'postgresql', path: `generated/q-${index}.postgres.sql`, sourceHash: hash(sql.replaceAll(/:[A-Za-z_][A-Za-z0-9_]*/g, (_, name) => `$${parameterNames.indexOf(name) + 1}`)), parameterStyle: 'indexed', parameterNames },
    capabilities: { parser: { status: 'ok' } },
    contract: {
      database: { system: 'postgresql', serverMajor: 18, parameters: parameterNames.map((name, i) => field(name, i + 1, name === 'limit' || name === 'cursor' ? 'int4' : 'text')), results: resultNames.map((name, i) => field(name, i + 1, name === 'subject' || name === 'status' || name === 'assignee_name' ? 'text' : 'int4')), dependencies },
      driver: { profile: 'node-postgres-default', parameters: parameterNames.map((name, i) => driverField(name, i + 1, name === 'limit' || name === 'cursor' ? 'number' : 'string')), results: resultNames.map((name, i) => driverField(name, i + 1, name === 'subject' || name === 'status' || name === 'assignee_name' ? 'string' : 'number')) },
    },
    provenance: { canonicalSql: 'authored', executableSql: 'derived', databaseContract: 'postgresql-catalog', resultNullability: 'inferred-or-unknown' },
    diagnostics: [],
  };
}

function snapshot(count: number, variant = 'base'): AnyRecord {
  const entries = Array.from({ length: count }, (_, index) => {
    const sql = sqlFor(index, variant);
    const value = resource(index, sql);
    return { id: value.id, canonicalPath: value.canonical.path, canonicalBytes: value.canonical.bytes, sourceHash: value.canonical.sourceHash, sourceSql: sql, status: 'described', resourcePath: `resources/q-${index}.resource.json`, resource: value };
  });
  return { version: 1, kind: 'ashiba-sql-resource-fleet', root: '.', database: { system: 'postgresql', driverProfile: 'node-postgres-default' }, entries };
}

function withChange(before: AnyRecord, index: number, kind: string): AnyRecord {
  const after = structuredClone(before);
  const entry = after.entries[index];
  if (!entry) return after;
  let sql = sqlFor(index, kind === 'formatting/comment-only' ? 'comment' : kind === 'semantic predicate' ? 'semantic' : 'base');
  if (kind === 'parameter add') {
    sql = sql.replace('    AND (:assignee IS NULL OR u.name = :assignee)', '    AND (:assignee IS NULL OR u.name = :assignee)\n    AND t.priority >= :priority');
    entry.resource.executable.parameterNames.push('priority');
    entry.resource.contract.database.parameters.push(field('priority', 5, 'int4'));
    entry.resource.contract.driver.parameters.push(driverField('priority', 5, 'number'));
  } else if (kind === 'parameter remove') {
    sql = sql.replace('WHERE id > :cursor\n', '');
    entry.resource.executable.parameterNames = entry.resource.executable.parameterNames.slice(0, -1);
    entry.resource.contract.database.parameters = entry.resource.contract.database.parameters.slice(0, -1);
    entry.resource.contract.driver.parameters = entry.resource.contract.driver.parameters.slice(0, -1);
  } else if (kind === 'result column add') {
    sql = sql.replace('SELECT id, subject, status, assignee_name', 'SELECT id, subject, status, assignee_name, created_at');
    entry.resource.contract.database.results.push(field('created_at', 5, 'timestamptz'));
    entry.resource.contract.driver.results.push(driverField('created_at', 5, 'string'));
  } else if (kind === 'result column remove') {
    sql = sql.replace('SELECT id, subject, status, assignee_name', 'SELECT id, subject, status');
    entry.resource.contract.database.results = entry.resource.contract.database.results.slice(0, -1);
    entry.resource.contract.driver.results = entry.resource.contract.driver.results.slice(0, -1);
  } else if (kind === 'table change') {
    sql = sql.replaceAll('support.tickets', 'support.archived_tickets');
    entry.resource.contract.database.dependencies[0].name = 'archived_tickets';
  } else if (kind === 'column change') {
    sql = sql.replace('t.status = :status', 't.priority = :status');
    entry.resource.contract.database.dependencies[2].column = 'priority';
  }
  entry.sourceSql = sql;
  entry.resource.canonical.sourceHash = hash(sql);
  entry.sourceHash = hash(sql);
  entry.resource.canonical.bytes = Buffer.byteLength(sql);
  return after;
}

function ordinaryEvidence(before: AnyRecord, after: AnyRecord): AnyRecord {
  const changed: AnyRecord[] = [];
  const beforeByPath = new Map(before.entries.map((entry: AnyRecord) => [entry.canonicalPath, entry]));
  const afterByPath = new Map(after.entries.map((entry: AnyRecord) => [entry.canonicalPath, entry]));
  for (const path of [...new Set([...beforeByPath.keys(), ...afterByPath.keys()])].sort()) {
    const left = beforeByPath.get(path); const right = afterByPath.get(path);
    if (!left || !right) changed.push({ path, kind: left ? 'removed query' : 'added query' });
    else if (left.sourceHash !== right.sourceHash) changed.push({ path, kind: 'text/hash changed' });
  }
  return { changedFiles: changed.length, changed, method: 'git diff + ordinary hash/rg candidate scan', persistentArtifact: false };
}

function deriveNow(before: AnyRecord, after: AnyRecord): AnyRecord {
  const beforeById = new Map(before.entries.map((entry: AnyRecord) => [entry.id, entry]));
  const afterById = new Map(after.entries.map((entry: AnyRecord) => [entry.id, entry]));
  const derived: AnyRecord[] = [];
  for (const id of [...new Set([...beforeById.keys(), ...afterById.keys()])].sort()) {
    const left = beforeById.get(id); const right = afterById.get(id);
    if (!left || !right) { derived.push({ id, classification: 'needs-review', reason: left ? 'removed query' : 'added query' }); continue; }
    const leftSql = readCanonicalSql(left); const rightSql = readCanonicalSql(right);
    const leftBinding = compileNamedParameters(leftSql);
    const rightBinding = compileNamedParameters(rightSql);
    const changes: string[] = [];
    if (leftSql !== rightSql) changes.push('canonical SQL changed');
    if (JSON.stringify(leftBinding.parameterNames) !== JSON.stringify(rightBinding.parameterNames)) changes.push('parameter set changed');
    if (JSON.stringify(left.resource.contract.database.dependencies) !== JSON.stringify(right.resource.contract.database.dependencies)) changes.push('dependency set changed');
    if (JSON.stringify(left.resource.contract.database.results) !== JSON.stringify(right.resource.contract.database.results)) changes.push('result contract changed');
    derived.push({ id, classification: changes.length ? 'needs-review' : 'unaffected', changes });
  }
  return { checked: derived.length, affected: derived.filter((item) => item.classification !== 'unaffected').length, changed: derived.filter((item) => item.classification !== 'unaffected'), method: 'derive current semantic facts from before/after SQL in memory', persistentArtifact: false };
}

function readCanonicalSql(entry: AnyRecord): string {
  return entry.sourceSql;
}

describe('SQL-resource final ownership ablation harness', () => {
  it('compares current snapshot, no-artifact, and derive-now arms at all required scales', () => {
    const scaleResults: AnyRecord[] = [];
    for (const count of scales) {
      const before = snapshot(count);
      let after = withChange(before, Math.min(1, count - 1), 'semantic predicate');
      after = withChange(after, Math.min(2, count - 1), 'parameter add');
      const armAPath = mkdtempSync(join(tmpdir(), 'ashiba-sql-resource-ablation-'));
      const beforePath = join(armAPath, 'before.json'); const afterPath = join(armAPath, 'after.json');
      writeFileSync(beforePath, JSON.stringify(before)); writeFileSync(afterPath, JSON.stringify(after));
      const a = compareSqlResourceSnapshotFiles(beforePath, afterPath);
      const b = ordinaryEvidence(before, after);
      const c = deriveNow(before, after);
      scaleResults.push({ count, armA: { checked: a.summary.checked, affected: a.metrics.affectedQueries, summary: a.summary, deterministicFieldsCompared: a.metrics.deterministicFieldsCompared }, armB: b, armC: c, snapshotBytes: readFileSync(beforePath).byteLength + readFileSync(afterPath).byteLength });
      rmSync(armAPath, { recursive: true, force: true });
      expect(a.summary.checked).toBeGreaterThanOrEqual(count);
      expect(c.checked).toBe(count);
    }
    const before = snapshot(20);
    const categoryResults = changeKinds.map((kind, i) => {
      let after: AnyRecord;
      if (kind === 'query add') {
        const added = structuredClone(snapshot(1).entries[0]);
        added.id = 'ashiba:query:q-added'; added.canonicalPath = 'queries/q-added.sql'; added.sourceSql = sqlFor(9999);
        after = { ...before, entries: [...before.entries, added] };
      } else if (kind === 'query remove') {
        after = { ...before, entries: before.entries.slice(0, -1) };
      } else {
        after = withChange(before, i % 20, kind);
      }
      const comparison = compareSqlResourceFleetSnapshots(before, after);
      return { kind, summary: comparison.summary, affected: comparison.metrics.affectedQueries, classifications: [...new Set(comparison.queries.map((query) => query.classification))] };
    });
    const result = {
      harness: 'sql-resource-final-ownership-ablation', version: 1, generatedAt: new Date().toISOString(),
      arms: { A: 'persisted JSON snapshots compared with existing compareSqlResourceSnapshotFiles', B: 'ordinary git/hash/rg-style evidence with no fleet artifact', C: 'in-memory derive-now semantic comparison with compileNamedParameters' },
      changeKinds, scales, scaleResults, categoryResults,
      limitations: [
        'Synthetic fixtures exercise the existing comparison model but do not claim PostgreSQL catalog truth.',
        'Arm B is a reproducible ordinary-tool baseline, not a fresh-agent behavioral trial.',
        'No live database was required; live contract derivation remains an application/CI concern.',
      ],
    };
    const outputPath = join(import.meta.dirname, 'raw-results.json');
    writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    expect(categoryResults).toHaveLength(changeKinds.length);
    expect(result.limitations.length).toBeGreaterThan(0);
  });
});
