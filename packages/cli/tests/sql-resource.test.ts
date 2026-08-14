import { describe, expect, test } from 'vitest';
import {
  compareSqlResourceFleetSnapshots,
  type SqlResource,
  type SqlResourceFleetSnapshot,
  type SqlResourceSnapshotEntry,
} from '../src/commands/sql-resource.js';
import type { PostgresPortableDatabaseTypeIdentity } from '../src/commands/postgres-contract.js';

const int2 = type('int2', 'smallint');
const int4 = type('int4', 'integer');
const int8 = type('int8', 'bigint');

describe('SQL resource fleet comparison', () => {
  test('classifies PostgreSQL failure separately from contract changes and compatible widening', () => {
    const before = fleet([
      entry('stable', resource('stable', int4)),
      entry('widen', resource('widen', int2)),
      entry('driver-change', resource('driver-change', int4)),
      entry('removed-column', resource('removed-column', int4)),
    ]);
    const after = fleet([
      entry('stable', resource('stable', int4)),
      entry('widen', resource('widen', int4)),
      entry('driver-change', resource('driver-change', int8, 'string')),
      errorEntry('removed-column', '42703', 'column does not exist'),
    ]);

    const comparison = compareSqlResourceFleetSnapshots(before, after);
    expect(comparison.summary).toEqual({
      checked: 4,
      unaffected: 1,
      compatible: 1,
      contractChanged: 1,
      executionBreaking: 1,
      needsReview: 0,
    });
    expect(classification(comparison, 'widen')).toBe('compatible');
    expect(classification(comparison, 'driver-change')).toBe('contract-changed');
    expect(classification(comparison, 'removed-column')).toBe('execution-breaking');
  });

  test('treats enum append as compatible, removal as contract changed, and domain constraints as review', () => {
    const queued = enumType(['queued']);
    const queuedDone = enumType(['queued', 'done']);
    const domainBefore = domainType('CHECK (VALUE > 0)');
    const domainAfter = domainType('CHECK (VALUE >= 0)');
    const added = compareSqlResourceFleetSnapshots(
      fleet([entry('enum', resource('enum', queued)), entry('domain', resource('domain', domainBefore))]),
      fleet([entry('enum', resource('enum', queuedDone)), entry('domain', resource('domain', domainAfter))]),
    );
    expect(classification(added, 'enum')).toBe('compatible');
    expect(classification(added, 'domain')).toBe('needs-review');

    const removed = compareSqlResourceFleetSnapshots(
      fleet([entry('enum', resource('enum', queuedDone))]),
      fleet([entry('enum', resource('enum', queued))]),
    );
    expect(classification(removed, 'enum')).toBe('contract-changed');
  });

  test('does not use search-path-dependent formatted names as cross-cluster identity', () => {
    const qualified = { ...enumType(['queued']), formattedName: 'app.state' };
    const visible = { ...enumType(['queued']), formattedName: 'state' };
    const comparison = compareSqlResourceFleetSnapshots(
      fleet([entry('portable', resource('portable', qualified))]),
      fleet([entry('portable', resource('portable', visible))]),
    );
    expect(classification(comparison, 'portable')).toBe('unaffected');
  });

  test('does not treat equal driver primitives as proof of database type compatibility', () => {
    const textType = { ...type('text', 'text'), category: 'S' };
    const uuidType = { ...type('uuid', 'uuid'), category: 'U' };
    const comparison = compareSqlResourceFleetSnapshots(
      fleet([entry('string-types', resource('string-types', textType, 'string'))]),
      fleet([entry('string-types', resource('string-types', uuidType, 'string'))]),
    );
    expect(classification(comparison, 'string-types')).toBe('contract-changed');
  });

  test('requires review when source or PostgreSQL major differs', () => {
    const oldEntry = entry('review', resource('review', int4));
    const changedSource = entry('review', resource('review', int8, 'string'));
    changedSource.sourceHash = 'sha256:changed';
    changedSource.resource!.canonical.sourceHash = 'sha256:changed';
    expect(classification(compareSqlResourceFleetSnapshots(fleet([oldEntry]), fleet([changedSource])), 'review')).toBe('needs-review');

    const nextMajor = entry('review', resource('review', int4));
    nextMajor.resource!.contract.database.serverMajor = 19;
    expect(classification(compareSqlResourceFleetSnapshots(fleet([oldEntry]), fleet([nextMajor])), 'review')).toBe('needs-review');
  });

  test('reduces a 100-query fleet to five affected resources deterministically', () => {
    const beforeEntries = Array.from({ length: 100 }, (_, index) => entry(`query-${index}`, resource(`query-${index}`, int4), 100));
    const afterEntries = beforeEntries.map((item, index) => index < 5
      ? entry(`query-${index}`, resource(`query-${index}`, int8, 'string'), 100)
      : structuredClone(item));
    const first = compareSqlResourceFleetSnapshots(fleet(beforeEntries), fleet(afterEntries));
    const second = compareSqlResourceFleetSnapshots(fleet(beforeEntries), fleet(afterEntries));
    expect(first).toEqual(second);
    expect(first.metrics).toMatchObject({
      canonicalSqlBytes: 10_000,
      affectedCanonicalSqlBytes: 500,
      canonicalSqlBytesAvoided: 9_500,
      sourceReductionPercent: 95,
      affectedQueries: 5,
    });
    expect(first.metrics.compactPayloadBytes).toBeLessThan(first.metrics.canonicalSqlBytes);
    expect(first.queries.filter((query) => query.classification !== 'unaffected')).toHaveLength(5);
  });
});

function classification(result: ReturnType<typeof compareSqlResourceFleetSnapshots>, id: string): string | undefined {
  return result.queries.find((query) => query.id === `ashiba:query:${id}`)?.classification;
}

function fleet(entries: SqlResourceSnapshotEntry[]): SqlResourceFleetSnapshot {
  return {
    version: 1,
    kind: 'ashiba-sql-resource-fleet',
    root: '.',
    database: { system: 'postgresql', driverProfile: 'node-postgres-default' },
    entries,
  };
}

function entry(id: string, value: SqlResource, canonicalBytes = 40): SqlResourceSnapshotEntry {
  return {
    id: `ashiba:query:${id}`,
    canonicalPath: `${id}.sql`,
    canonicalBytes,
    sourceHash: 'sha256:same',
    status: 'described',
    resourcePath: `${id}.resource.json`,
    resource: value,
  };
}

function errorEntry(id: string, code: string, message: string): SqlResourceSnapshotEntry {
  return {
    id: `ashiba:query:${id}`,
    canonicalPath: `${id}.sql`,
    canonicalBytes: 40,
    sourceHash: 'sha256:same',
    status: 'error',
    error: { code, message },
  };
}

function resource(id: string, databaseType: PostgresPortableDatabaseTypeIdentity, driverType = 'number'): SqlResource {
  const field = {
    position: 1,
    name: 'value',
    nameProvenance: 'proven' as const,
    databaseType,
    nullability: { value: 'non-null' as const, provenance: 'inferred' as const },
  };
  const driverField = {
    position: 1,
    name: 'value',
    runtimeType: driverType as 'number' | 'string',
    typeScriptType: driverType,
    provenance: 'driver-mapped' as const,
  };
  return {
    version: 1,
    status: 'described',
    id: `ashiba:query:${id}`,
    canonical: { path: `${id}.sql`, mediaType: 'application/sql', sourceHash: 'sha256:same', bytes: 40 },
    executable: {
      dialect: 'postgresql', path: `${id}.postgres.sql`, sourceHash: 'sha256:compiled',
      parameterStyle: 'dollar-numbered', orderedNames: [],
    },
    capabilities: { parser: { status: 'ok' }, optionalSubtraction: [], safeSort: [] },
    contract: {
      database: { system: 'postgresql', serverMajor: 18, parameters: [], results: [field], dependencies: [] },
      driver: { profile: 'node-postgres-default', parameters: [], results: [driverField] },
    },
    provenance: {
      canonicalSql: 'authored', executableSql: 'derived', databaseContract: 'postgresql-catalog',
      resultNullability: 'inferred-or-unknown',
    },
    diagnostics: [],
  };
}

function type(name: string, formattedName: string): PostgresPortableDatabaseTypeIdentity {
  return { schema: 'pg_catalog', name, formattedName, kind: 'base', category: 'N' };
}

function enumType(values: string[]): PostgresPortableDatabaseTypeIdentity {
  return { schema: 'app', name: 'state', formattedName: 'app.state', kind: 'enum', category: 'E', enumValues: values };
}

function domainType(definition: string): PostgresPortableDatabaseTypeIdentity {
  return {
    schema: 'app', name: 'positive', formattedName: 'app.positive', kind: 'domain', category: 'N',
    baseType: int4,
    domainConstraints: [{ name: 'positive_check', definition, validated: true }],
  };
}
