import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import { invalidCliInputError } from '../errors.js';
import { normalizeSqlSource } from '../sql-source.js';
import { loadProjectPathConfig } from './config.js';
import { buildFeatureQueryModel } from './feature.js';
import {
  derivePostgresQueryContractFromDatabase,
  type PostgresDerivedQueryContract,
  type PostgresDriverProfile,
  type PostgresPortableDatabaseTypeIdentity,
  type PostgresQueryDependency,
} from './postgres-contract.js';

export type SqlResourceClassification =
  | 'unaffected'
  | 'compatible'
  | 'contract-changed'
  | 'execution-breaking'
  | 'needs-review';

export interface PortableContractField {
  position: number;
  name?: string;
  nameProvenance?: 'proven' | 'inferred' | 'unknown';
  databaseType: PostgresPortableDatabaseTypeIdentity;
  typeModifier?: number;
  nullability: { value: 'non-null' | 'nullable' | 'unknown'; provenance: 'inferred' | 'unknown' };
}

export interface SqlResource {
  version: 1;
  status: 'described';
  id: string;
  canonical: {
    path: string;
    mediaType: 'application/sql';
    sourceHash: string;
    bytes: number;
  };
  executable: {
    dialect: 'postgresql';
    path: string;
    sourceHash: string;
    parameterStyle: 'indexed';
    parameterNames: string[];
  };
  capabilities: {
    parser: unknown;
    optionalSubtraction: unknown;
    safeSort: unknown;
  };
  contract: {
    database: {
      system: 'postgresql';
      serverMajor: number;
      parameters: PortableContractField[];
      results: PortableContractField[];
      dependencies: PostgresQueryDependency[];
    };
    driver: PostgresDerivedQueryContract['driver'];
  };
  provenance: {
    canonicalSql: 'authored';
    executableSql: 'derived';
    databaseContract: 'postgresql-catalog';
    resultNullability: 'inferred-or-unknown';
  };
  diagnostics: PostgresDerivedQueryContract['diagnostics'];
}

export interface SqlResourceSnapshotEntry {
  id: string;
  canonicalPath: string;
  canonicalBytes: number;
  sourceHash: string;
  status: 'described' | 'error';
  resourcePath?: string;
  resource?: SqlResource;
  error?: { code: string; message: string };
}

export interface SqlResourceFleetSnapshot {
  version: 1;
  kind: 'ashiba-sql-resource-fleet';
  root: '.';
  database: { system: 'postgresql'; driverProfile: PostgresDriverProfile };
  entries: SqlResourceSnapshotEntry[];
}

export interface SqlResourceChange {
  area: 'source' | 'parameter' | 'result' | 'driver' | 'dependency' | 'execution' | 'fleet';
  path: string;
  before?: unknown;
  after?: unknown;
  provenance: string;
  reason: string;
  impact: Exclude<SqlResourceClassification, 'unaffected'>;
}

export interface SqlResourceQueryComparison {
  id: string;
  canonicalPath: string;
  sourceHashBefore?: string;
  sourceHashAfter?: string;
  classification: SqlResourceClassification;
  changes: SqlResourceChange[];
}

export interface SqlResourceFleetComparison {
  version: 1;
  kind: 'ashiba-sql-resource-comparison';
  summary: {
    checked: number;
    unaffected: number;
    compatible: number;
    contractChanged: number;
    executionBreaking: number;
    needsReview: number;
  };
  metrics: {
    canonicalSqlBytes: number;
    affectedCanonicalSqlBytes: number;
    canonicalSqlBytesAvoided: number;
    sourceReductionPercent: number;
    affectedQueries: number;
    deterministicFieldsCompared: number;
    compactPayloadBytes: number;
  };
  queries: SqlResourceQueryComparison[];
}

interface SnapshotOptions {
  rootDir?: string;
  databaseUrl?: string;
  databaseUrlEnv?: string;
  driverProfile?: string;
  out?: string;
  format?: string;
}

interface CompareOptions {
  before: string;
  after: string;
  out?: string;
  query?: string;
  details?: boolean;
  format?: string;
}

/** Register development-time, language-neutral SQL resource commands. */
export function registerSqlResourceCommand(program: Command): void {
  const resource = program.command('sql-resource')
    .description('Generate and compare language-neutral PostgreSQL SQL resource snapshots');

  resource.command('snapshot')
    .description('Describe every canonical SQL query against a development PostgreSQL database')
    .option('--root-dir <path>', 'Project root directory', process.cwd())
    .option('--database-url <url>', 'Development/test PostgreSQL connection URL')
    .option('--database-url-env <name>', 'Environment variable containing the PostgreSQL URL', 'ASHIBA_POSTGRES_DATABASE_URL')
    .option('--driver-profile <profile>', 'Driver profile: node-postgres-default or custom:<stable-id>', 'node-postgres-default')
    .option('--out <path>', 'Fleet snapshot JSON path', 'generated/sql-resource-fleet.snapshot.json')
    .option('--format <format>', 'Output format: text or json', 'text')
    .action(async (options: SnapshotOptions) => {
      const result = await createSqlResourceFleetSnapshot(options);
      process.stdout.write(formatSnapshotResult(result, options.format));
    });

  resource.command('compare')
    .description('Compare before/after SQL resource fleet snapshots')
    .requiredOption('--before <path>', 'Before fleet snapshot JSON')
    .requiredOption('--after <path>', 'After fleet snapshot JSON')
    .option('--out <path>', 'Persist the full deterministic comparison JSON')
    .option('--query <id>', 'Show one query detail by stable ID or canonical path')
    .option('--details', 'Include all query details in terminal output')
    .option('--format <format>', 'Output format: text or json', 'text')
    .action((options: CompareOptions) => {
      const result = compareSqlResourceSnapshotFiles(options.before, options.after);
      if (options.out) writeJson(path.resolve(options.out), result);
      process.stdout.write(formatComparisonResult(result, options));
    });
}

export async function createSqlResourceFleetSnapshot(options: SnapshotOptions): Promise<SqlResourceFleetSnapshot> {
  const rootDir = path.resolve(options.rootDir ?? '.');
  const connectionString = resolveDatabaseUrl(options);
  const driverProfile = parseDriverProfile(options.driverProfile);
  const queryPaths = discoverCanonicalFeatureQueries(rootDir);
  const entries: SqlResourceSnapshotEntry[] = [];
  for (const sqlPath of queryPaths) {
    const canonicalPath = toProjectPath(rootDir, sqlPath);
    const canonicalSql = normalizeSqlSource(readFileSync(sqlPath, 'utf8'));
    const sourceHash = hashSource(canonicalSql);
    const canonicalBytes = Buffer.byteLength(canonicalSql, 'utf8');
    const id = stableQueryId(canonicalPath);
    try {
      const model = buildFeatureQueryModel(canonicalSql, rootDir);
      const contract = await derivePostgresQueryContractFromDatabase(connectionString, {
        sql: canonicalSql,
        compiledSql: model.bindings.postgres.sql,
        parameterNames: model.bindings.postgres.parameterNames,
        resultColumnOrder: model.analysis.resultColumnOrder,
        resultColumnNullability: model.analysis.resultColumnNullability,
        driverProfile,
      });
      const generatedDir = path.join(path.dirname(sqlPath), 'generated');
      const executablePath = path.join(generatedDir, 'query.postgres.sql');
      const resourcePath = path.join(generatedDir, 'query.resource.json');
      const executableSql = `${model.bindings.postgres.sql.trim()}\n`;
      const resourceValue: SqlResource = {
        version: 1,
        status: 'described',
        id,
        canonical: {
          path: canonicalPath,
          mediaType: 'application/sql',
          sourceHash,
          bytes: canonicalBytes,
        },
        executable: {
          dialect: 'postgresql',
          path: toProjectPath(rootDir, executablePath),
          sourceHash: hashSource(executableSql),
          parameterStyle: 'indexed',
          parameterNames: [...model.bindings.postgres.parameterNames],
        },
        capabilities: {
          parser: model.analysis.parserCapabilities,
          optionalSubtraction: model.analysis.optionalConditionCompression,
          safeSort: model.analysis.safeSort,
        },
        contract: toPortableContract(contract),
        provenance: {
          canonicalSql: 'authored',
          executableSql: 'derived',
          databaseContract: 'postgresql-catalog',
          resultNullability: 'inferred-or-unknown',
        },
        diagnostics: contract.diagnostics,
      };
      mkdirSync(generatedDir, { recursive: true });
      writeFileSync(executablePath, executableSql, 'utf8');
      writeJson(resourcePath, resourceValue);
      entries.push({
        id,
        canonicalPath,
        canonicalBytes,
        sourceHash,
        status: 'described',
        resourcePath: toProjectPath(rootDir, resourcePath),
        resource: resourceValue,
      });
    } catch (error) {
      const generatedDir = path.join(path.dirname(sqlPath), 'generated');
      const resourcePath = path.join(generatedDir, 'query.resource.json');
      const safeError = toSafeError(error);
      writeJson(resourcePath, {
        version: 1,
        status: 'error',
        id,
        canonical: {
          path: canonicalPath,
          mediaType: 'application/sql',
          sourceHash,
          bytes: canonicalBytes,
        },
        error: safeError,
        provenance: { canonicalSql: 'authored', databaseContract: 'postgresql-prepare-failed' },
      });
      entries.push({
        id,
        canonicalPath,
        canonicalBytes,
        sourceHash,
        status: 'error',
        resourcePath: toProjectPath(rootDir, resourcePath),
        error: safeError,
      });
    }
  }
  const snapshot: SqlResourceFleetSnapshot = {
    version: 1,
    kind: 'ashiba-sql-resource-fleet',
    root: '.',
    database: { system: 'postgresql', driverProfile },
    entries: entries.sort((left, right) => left.id.localeCompare(right.id)),
  };
  writeJson(path.resolve(rootDir, options.out ?? 'generated/sql-resource-fleet.snapshot.json'), snapshot);
  return snapshot;
}

export function compareSqlResourceSnapshotFiles(beforePath: string, afterPath: string): SqlResourceFleetComparison {
  return compareSqlResourceFleetSnapshots(readSnapshot(beforePath), readSnapshot(afterPath));
}

export function compareSqlResourceFleetSnapshots(
  before: SqlResourceFleetSnapshot,
  after: SqlResourceFleetSnapshot,
): SqlResourceFleetComparison {
  const beforeById = new Map(before.entries.map((entry) => [entry.id, entry]));
  const afterById = new Map(after.entries.map((entry) => [entry.id, entry]));
  const ids = [...new Set([...beforeById.keys(), ...afterById.keys()])].sort();
  let deterministicFieldsCompared = 0;
  const queries = ids.map((id) => {
    const result = compareEntry(id, beforeById.get(id), afterById.get(id));
    deterministicFieldsCompared += result.fieldsCompared;
    return result.comparison;
  });
  const count = (classification: SqlResourceClassification): number =>
    queries.filter((query) => query.classification === classification).length;
  const affected = queries.filter((query) => query.classification !== 'unaffected');
  const canonicalSqlBytes = sumUniqueCanonicalBytes(before.entries, after.entries);
  const affectedIds = new Set(affected.map((query) => query.id));
  const affectedCanonicalSqlBytes = sumUniqueCanonicalBytes(
    before.entries.filter((entry) => affectedIds.has(entry.id)),
    after.entries.filter((entry) => affectedIds.has(entry.id)),
  );
  const summary = {
    checked: queries.length,
    unaffected: count('unaffected'),
    compatible: count('compatible'),
    contractChanged: count('contract-changed'),
    executionBreaking: count('execution-breaking'),
    needsReview: count('needs-review'),
  };
  const compactBasis = { summary, affected: affected.map(compactQueryComparison) };
  return {
    version: 1,
    kind: 'ashiba-sql-resource-comparison',
    summary,
    metrics: {
      canonicalSqlBytes,
      affectedCanonicalSqlBytes,
      canonicalSqlBytesAvoided: canonicalSqlBytes - affectedCanonicalSqlBytes,
      sourceReductionPercent: canonicalSqlBytes === 0
        ? 0
        : Number((((canonicalSqlBytes - affectedCanonicalSqlBytes) / canonicalSqlBytes) * 100).toFixed(2)),
      affectedQueries: affected.length,
      deterministicFieldsCompared,
      compactPayloadBytes: Buffer.byteLength(JSON.stringify(compactBasis), 'utf8'),
    },
    queries,
  };
}

function compareEntry(
  id: string,
  before: SqlResourceSnapshotEntry | undefined,
  after: SqlResourceSnapshotEntry | undefined,
): { comparison: SqlResourceQueryComparison; fieldsCompared: number } {
  const canonicalPath = after?.canonicalPath ?? before?.canonicalPath ?? id;
  const base = {
    id,
    canonicalPath,
    ...(before ? { sourceHashBefore: before.sourceHash } : {}),
    ...(after ? { sourceHashAfter: after.sourceHash } : {}),
  };
  if (!before || !after) {
    return {
      comparison: {
        ...base,
        classification: 'needs-review',
        changes: [{
          area: 'fleet', path: id, before: before?.status, after: after?.status,
          provenance: 'snapshot', reason: before ? 'Query is missing from the after fleet.' : 'Query is new in the after fleet.',
          impact: 'needs-review',
        }],
      },
      fieldsCompared: 1,
    };
  }
  if (before.status === 'described' && after.status === 'error') {
    return {
      comparison: {
        ...base,
        classification: 'execution-breaking',
        changes: [{
          area: 'execution', path: 'postgresql.prepare', before: 'described', after: after.error,
          provenance: 'postgresql', reason: 'The unchanged or changed SQL can no longer be prepared by PostgreSQL.',
          impact: 'execution-breaking',
        }],
      },
      fieldsCompared: 1,
    };
  }
  if (before.status === 'error' || after.status === 'error' || !before.resource || !after.resource) {
    return {
      comparison: {
        ...base,
        classification: 'needs-review',
        changes: [{
          area: 'execution', path: 'postgresql.prepare', before: before.error ?? before.status, after: after.error ?? after.status,
          provenance: 'postgresql', reason: 'At least one snapshot lacks a comparable PostgreSQL contract.',
          impact: 'needs-review',
        }],
      },
      fieldsCompared: 1,
    };
  }
  const changes: SqlResourceChange[] = [];
  let fieldsCompared = 0;
  if (before.sourceHash !== after.sourceHash) {
    changes.push({
      area: 'source', path: 'canonical.sourceHash', before: before.sourceHash, after: after.sourceHash,
      provenance: 'canonical-sql', reason: 'Canonical SQL changed; database-only compatibility cannot be isolated.', impact: 'needs-review',
    });
  }
  const sameDriverProfile = before.resource.contract.driver.profile === after.resource.contract.driver.profile;
  fieldsCompared += compareFields('parameter', before.resource.contract.database.parameters, after.resource.contract.database.parameters,
    before.resource.contract.driver.parameters, after.resource.contract.driver.parameters, sameDriverProfile, changes);
  fieldsCompared += compareFields('result', before.resource.contract.database.results, after.resource.contract.database.results,
    before.resource.contract.driver.results, after.resource.contract.driver.results, sameDriverProfile, changes);
  fieldsCompared += compareDependencies(
    before.resource.contract.database.dependencies,
    after.resource.contract.database.dependencies,
    changes,
  );
  fieldsCompared += compareDriverProfile(before.resource, after.resource, changes);
  if (before.resource.contract.database.serverMajor !== after.resource.contract.database.serverMajor) {
    changes.push({
      area: 'fleet', path: 'database.serverMajor', before: before.resource.contract.database.serverMajor,
      after: after.resource.contract.database.serverMajor, provenance: 'postgresql',
      reason: 'Snapshots were derived from different PostgreSQL major versions.', impact: 'needs-review',
    });
    fieldsCompared += 1;
  }
  const classification = before.sourceHash !== after.sourceHash ? 'needs-review' : highestClassification(changes);
  return { comparison: { ...base, classification, changes }, fieldsCompared };
}

function compareFields(
  area: 'parameter' | 'result',
  before: readonly PortableContractField[],
  after: readonly PortableContractField[],
  beforeDriver: readonly PostgresDerivedQueryContract['driver']['parameters'][number][],
  afterDriver: readonly PostgresDerivedQueryContract['driver']['parameters'][number][],
  compareDriver: boolean,
  changes: SqlResourceChange[],
): number {
  let compared = 1;
  if (before.length !== after.length) {
    changes.push({
      area, path: `${area}s.length`, before: before.length, after: after.length, provenance: 'postgresql',
      reason: `${area} position count changed.`, impact: 'contract-changed',
    });
  }
  const positions = Math.max(before.length, after.length);
  for (let index = 0; index < positions; index += 1) {
    const left = before[index];
    const right = after[index];
    const leftDriver = beforeDriver[index];
    const rightDriver = afterDriver[index];
    compared += 5;
    if (!left || !right) continue;
    const pathPrefix = `${area}s[${index}]`;
    if (left.name !== right.name) {
      changes.push({ area, path: `${pathPrefix}.name`, before: left.name, after: right.name, provenance: 'postgresql',
        reason: `${area} name changed.`, impact: 'contract-changed' });
    }
    compareType(area, pathPrefix, left.databaseType, right.databaseType, changes);
    if (left.typeModifier !== right.typeModifier) {
      changes.push({ area, path: `${pathPrefix}.typeModifier`, before: left.typeModifier, after: right.typeModifier,
        provenance: 'postgresql-catalog', reason: `${area} type modifier changed.`, impact: 'contract-changed' });
    }
    if (left.nullability.value !== right.nullability.value) {
      const compatible = left.nullability.value === 'nullable' && right.nullability.value === 'non-null';
      changes.push({ area, path: `${pathPrefix}.nullability`, before: left.nullability, after: right.nullability,
        provenance: `${left.nullability.provenance}->${right.nullability.provenance}`,
        reason: compatible ? 'Nullability became stricter.' : 'Nullability became less strict or uncertain.',
        impact: compatible ? 'compatible' : 'contract-changed' });
    }
    if (compareDriver && (leftDriver?.typeScriptType !== rightDriver?.typeScriptType || leftDriver?.runtimeType !== rightDriver?.runtimeType)) {
      const compatibleDriverWidening = isEnumAppend(left.databaseType, right.databaseType)
        && leftDriver?.runtimeType === rightDriver?.runtimeType;
      changes.push({ area: 'driver', path: `${pathPrefix}.driver`, before: leftDriver, after: rightDriver,
        provenance: 'driver-mapped',
        reason: compatibleDriverWidening ? 'Driver enum union widened by appending values.' : 'Driver value representation changed.',
        impact: compatibleDriverWidening ? 'compatible' : 'contract-changed' });
    }
  }
  return compared;
}

function compareType(
  area: 'parameter' | 'result',
  pathPrefix: string,
  before: PostgresPortableDatabaseTypeIdentity,
  after: PostgresPortableDatabaseTypeIdentity,
  changes: SqlResourceChange[],
): void {
  if (stablePortableTypeJson(before) === stablePortableTypeJson(after)) return;
  if (before.kind === 'domain' && after.kind === 'domain'
    && sameTypeName(before, after)
    && stablePortableTypeJson({ ...before, domainConstraints: [] }) === stablePortableTypeJson({ ...after, domainConstraints: [] })) {
    changes.push({ area, path: `${pathPrefix}.databaseType.domainConstraints`, before: before.domainConstraints, after: after.domainConstraints,
      provenance: 'postgresql-catalog', reason: 'Domain constraints changed; value compatibility requires review.', impact: 'needs-review' });
    return;
  }
  if (before.kind === 'enum' && after.kind === 'enum' && sameTypeName(before, after)) {
    const oldValues = before.enumValues ?? [];
    const newValues = after.enumValues ?? [];
    const appended = oldValues.every((value, index) => newValues[index] === value) && newValues.length >= oldValues.length;
    changes.push({ area, path: `${pathPrefix}.databaseType.enumValues`, before: oldValues, after: newValues,
      provenance: 'postgresql-catalog', reason: appended ? 'Enum values were appended without removing existing values.' : 'Enum values were removed, renamed, or reordered.',
      impact: appended ? 'compatible' : 'contract-changed' });
    return;
  }
  if (before.kind === 'array' && after.kind === 'array' && before.elementType && after.elementType) {
    const nested: SqlResourceChange[] = [];
    compareType(area, `${pathPrefix}.databaseType.elementType`, before.elementType, after.elementType, nested);
    changes.push(...nested.map((change) => ({ ...change, reason: `Array element contract changed: ${change.reason}` })));
    return;
  }
  const builtInWidening = isKnownPortableWidening(before, after);
  const jsonIdentityChange = [before.name, after.name].every((name) => name === 'json' || name === 'jsonb')
    && before.name !== after.name;
  const compatible = !jsonIdentityChange && builtInWidening;
  changes.push({ area, path: `${pathPrefix}.databaseType`, before, after, provenance: 'postgresql-catalog',
    reason: compatible
      ? 'Database type changed while the selected driver representation remains compatible.'
      : 'Database type identity changed and is not covered by a proven compatibility rule.',
    impact: compatible ? 'compatible' : 'contract-changed' });
}

function compareDependencies(
  before: readonly PostgresQueryDependency[],
  after: readonly PostgresQueryDependency[],
  changes: SqlResourceChange[],
): number {
  const key = (dependency: PostgresQueryDependency): string =>
    [dependency.kind, dependency.schema, dependency.name, dependency.column ?? '', dependency.identityArguments ?? ''].join(':');
  const beforeMap = new Map(before.map((dependency) => [key(dependency), dependency]));
  const afterMap = new Map(after.map((dependency) => [key(dependency), dependency]));
  const keys = [...new Set([...beforeMap.keys(), ...afterMap.keys()])].sort();
  for (const dependencyKey of keys) {
    const left = beforeMap.get(dependencyKey);
    const right = afterMap.get(dependencyKey);
    if (!left || !right) {
      changes.push({ area: 'dependency', path: dependencyKey, before: left, after: right, provenance: 'postgresql-catalog',
        reason: 'The dependency set changed while the SQL remained preparable.', impact: 'needs-review' });
      continue;
    }
    if (left.columnNotNull !== right.columnNotNull) {
      const compatible = left.columnNotNull === false && right.columnNotNull === true;
      changes.push({ area: 'dependency', path: `${dependencyKey}.columnNotNull`, before: left.columnNotNull, after: right.columnNotNull,
        provenance: 'postgresql-catalog', reason: compatible ? 'Referenced column became NOT NULL.' : 'Referenced column became nullable.',
        impact: compatible ? 'compatible' : 'contract-changed' });
    }
    if (stablePortableTypeJson(left.columnType) !== stablePortableTypeJson(right.columnType)) {
      const compatible = left.columnType !== undefined && right.columnType !== undefined
        && isKnownPortableWidening(left.columnType, right.columnType);
      changes.push({
        area: 'dependency',
        path: `${dependencyKey}.columnType`,
        before: left.columnType,
        after: right.columnType,
        provenance: 'postgresql-catalog',
        reason: compatible
          ? 'Referenced column widened through a known PostgreSQL integer compatibility rule.'
          : 'Referenced column type changed while boundary contracts stayed stable; semantic compatibility requires review.',
        impact: compatible ? 'compatible' : 'needs-review',
      });
    }
    if (left.columnTypeModifier !== right.columnTypeModifier) {
      changes.push({ area: 'dependency', path: `${dependencyKey}.columnTypeModifier`, before: left.columnTypeModifier, after: right.columnTypeModifier,
        provenance: 'postgresql-catalog', reason: 'Referenced column type modifier changed.', impact: 'contract-changed' });
    }
    if (left.definitionHash !== right.definitionHash) {
      changes.push({ area: 'dependency', path: `${dependencyKey}.definitionHash`, before: left.definitionHash, after: right.definitionHash,
        provenance: 'postgresql-catalog', reason: 'Referenced view definition changed; join/nullability semantics require review.', impact: 'needs-review' });
    }
    if (left.resultType !== right.resultType) {
      changes.push({ area: 'dependency', path: `${dependencyKey}.resultType`, before: left.resultType, after: right.resultType,
        provenance: 'postgresql-catalog', reason: 'Referenced function result type changed.', impact: 'contract-changed' });
    }
  }
  return keys.length * 5;
}

function compareDriverProfile(before: SqlResource, after: SqlResource, changes: SqlResourceChange[]): number {
  if (before.contract.driver.profile !== after.contract.driver.profile) {
    changes.push({ area: 'driver', path: 'driver.profile', before: before.contract.driver.profile, after: after.contract.driver.profile,
      provenance: 'configuration', reason: 'Driver profiles differ, so representations are not directly comparable.', impact: 'needs-review' });
  }
  return 1;
}

function highestClassification(changes: readonly SqlResourceChange[]): SqlResourceClassification {
  const order: SqlResourceClassification[] = ['execution-breaking', 'contract-changed', 'needs-review', 'compatible'];
  return order.find((classification) => changes.some((change) => change.impact === classification)) ?? 'unaffected';
}

function toPortableContract(contract: PostgresDerivedQueryContract): SqlResource['contract'] {
  const toField = (field: PostgresDerivedQueryContract['database']['parameters'][number], includeNameProvenance: boolean): PortableContractField => {
    const databaseType = field.databaseType.portableIdentity;
    if (!databaseType) throw new Error(`PostgreSQL type ${field.databaseType.formattedName} lacks portable identity.`);
    const nameProvenance = includeNameProvenance && 'nameProvenance' in field
      ? (field as PostgresDerivedQueryContract['database']['results'][number]).nameProvenance
      : undefined;
    return {
      position: field.position,
      ...(field.name ? { name: field.name } : {}),
      ...(nameProvenance ? { nameProvenance } : {}),
      databaseType,
      ...(field.typeModifier !== undefined ? { typeModifier: field.typeModifier } : {}),
      nullability: field.nullability,
    };
  };
  return {
    database: {
      system: 'postgresql',
      serverMajor: contract.database.serverMajor,
      parameters: contract.database.parameters.map((field) => toField(field, false)),
      results: contract.database.results.map((field) => toField(field, true)),
      dependencies: [...(contract.database.dependencies ?? [])],
    },
    driver: contract.driver,
  };
}

function discoverCanonicalFeatureQueries(rootDir: string): string[] {
  const featureRoot = path.resolve(rootDir, loadProjectPathConfig(rootDir).featureRoot);
  if (!existsSync(featureRoot)) return [];
  const results: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'generated' && entry.name !== 'node_modules') visit(target);
      } else if (entry.isFile() && entry.name.endsWith('.sql')
        && path.basename(entry.name, '.sql') === path.basename(directory)
        && path.basename(path.dirname(directory)) === 'queries') {
        results.push(target);
      }
    }
  };
  visit(featureRoot);
  return results.sort((left, right) => toProjectPath(rootDir, left).localeCompare(toProjectPath(rootDir, right)));
}

function readSnapshot(snapshotPath: string): SqlResourceFleetSnapshot {
  const resolved = path.resolve(snapshotPath);
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(resolved, 'utf8'));
  } catch (error) {
    throw invalidCliInputError('ASHIBA_SQL_RESOURCE_SNAPSHOT_INVALID', `Cannot read SQL resource snapshot: ${resolved}.`,
      'Generate it with ashiba sql-resource snapshot.', { reason: error instanceof Error ? error.message : String(error) });
  }
  if (!isRecord(parsed) || parsed.version !== 1 || parsed.kind !== 'ashiba-sql-resource-fleet' || !Array.isArray(parsed.entries)) {
    throw invalidCliInputError('ASHIBA_SQL_RESOURCE_SNAPSHOT_INVALID', `SQL resource snapshot has an unsupported shape: ${resolved}.`,
      'Regenerate the snapshot with this Ashiba version.', {});
  }
  return parsed as unknown as SqlResourceFleetSnapshot;
}

function resolveDatabaseUrl(options: SnapshotOptions): string {
  const explicit = options.databaseUrl?.trim();
  if (explicit) return explicit;
  const environmentName = options.databaseUrlEnv?.trim() || 'ASHIBA_POSTGRES_DATABASE_URL';
  const value = process.env[environmentName]?.trim();
  if (value) return value;
  throw invalidCliInputError('ASHIBA_SQL_RESOURCE_DATABASE_URL_REQUIRED',
    `SQL resource snapshot requires --database-url or ${environmentName}.`,
    'Point the command at a disposable development/test PostgreSQL database.', { databaseUrlEnv: environmentName });
}

function parseDriverProfile(value: string | undefined): PostgresDriverProfile {
  const profile = value?.trim() || 'node-postgres-default';
  if (profile === 'node-postgres-default') return profile;
  if (profile.startsWith('custom:') && profile.slice('custom:'.length).trim()) return `custom:${profile.slice('custom:'.length).trim()}`;
  throw invalidCliInputError('ASHIBA_SQL_RESOURCE_DRIVER_PROFILE_INVALID', `Invalid driver profile: ${profile}.`,
    'Use node-postgres-default or custom:<stable-id>.', {});
}

function formatSnapshotResult(snapshot: SqlResourceFleetSnapshot, format = 'text'): string {
  if (format === 'json') return `${JSON.stringify(snapshot, null, 2)}\n`;
  if (format !== 'text') throw invalidCliInputError('ASHIBA_SQL_RESOURCE_FORMAT_INVALID', `Unsupported format: ${format}.`, 'Use text or json.', {});
  const described = snapshot.entries.filter((entry) => entry.status === 'described').length;
  const errors = snapshot.entries.length - described;
  return [`SQL resource fleet: ${snapshot.entries.length} checked`, `described: ${described}`, `errors: ${errors}`,
    ...snapshot.entries.filter((entry) => entry.status === 'error').map((entry) => `- ${entry.id}: ${entry.error?.message ?? 'unknown error'}`), ''].join('\n');
}

function formatComparisonResult(result: SqlResourceFleetComparison, options: CompareOptions): string {
  const selected = options.query
    ? result.queries.filter((query) => query.id === options.query || query.canonicalPath === options.query)
    : options.details ? result.queries : result.queries.filter((query) => query.classification !== 'unaffected').map(compactQueryComparison);
  if (options.query && selected.length === 0) {
    throw invalidCliInputError('ASHIBA_SQL_RESOURCE_QUERY_NOT_FOUND', `Query was not found in comparison: ${options.query}.`,
      'Use the stable query ID or canonical path emitted by the summary.', {});
  }
  const payload = { version: result.version, kind: result.kind, summary: result.summary, metrics: result.metrics, queries: selected };
  if (options.format === 'json') return `${JSON.stringify(payload, null, 2)}\n`;
  if (options.format !== undefined && options.format !== 'text') {
    throw invalidCliInputError('ASHIBA_SQL_RESOURCE_FORMAT_INVALID', `Unsupported format: ${options.format}.`, 'Use text or json.', {});
  }
  return [
    `${result.summary.checked} queries checked`,
    `${result.summary.unaffected} unaffected`,
    `${result.summary.compatible} compatible`,
    `${result.summary.contractChanged} contract changed`,
    `${result.summary.executionBreaking} execution breaking`,
    `${result.summary.needsReview} needs review`,
    `affected SQL: ${result.metrics.affectedCanonicalSqlBytes}/${result.metrics.canonicalSqlBytes} bytes (${result.metrics.sourceReductionPercent}% avoided)`,
    ...selected.map((query) => {
      const typed = query as ReturnType<typeof compactQueryComparison> | SqlResourceQueryComparison;
      const reasons = 'reasons' in typed ? typed.reasons : typed.changes.map((change) => change.reason);
      return `- ${typed.id}: ${typed.classification} — ${reasons.join('; ')}`;
    }),
    '',
  ].join('\n');
}

function compactQueryComparison(query: SqlResourceQueryComparison): {
  id: string;
  canonicalPath: string;
  classification: SqlResourceClassification;
  reasons: string[];
} {
  return {
    id: query.id,
    canonicalPath: query.canonicalPath,
    classification: query.classification,
    reasons: [...new Set(query.changes.map((change) => change.reason))],
  };
}

function sumUniqueCanonicalBytes(...entryGroups: readonly SqlResourceSnapshotEntry[][]): number {
  const bytes = new Map<string, number>();
  for (const entries of entryGroups) for (const entry of entries) bytes.set(entry.id, Math.max(bytes.get(entry.id) ?? 0, entry.canonicalBytes));
  return [...bytes.values()].reduce((total, value) => total + value, 0);
}

function stableQueryId(canonicalPath: string): string {
  return `ashiba:query:${canonicalPath.replace(/\.sql$/i, '')}`;
}

function toProjectPath(rootDir: string, target: string): string {
  return path.relative(rootDir, target).replaceAll(path.sep, '/');
}

function hashSource(source: string): string {
  return `sha256:${createHash('sha256').update(normalizeSqlSource(source)).digest('hex')}`;
}

function writeJson(target: string, value: unknown): void {
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function toSafeError(error: unknown): { code: string; message: string } {
  const record = isRecord(error) ? error : {};
  return {
    code: typeof record.code === 'string' ? record.code : 'ASHIBA_SQL_RESOURCE_DESCRIPTION_FAILED',
    message: error instanceof Error ? error.message : String(error),
  };
}

function sameTypeName(left: PostgresPortableDatabaseTypeIdentity, right: PostgresPortableDatabaseTypeIdentity): boolean {
  return left.schema === right.schema && left.name === right.name && left.kind === right.kind;
}

function isEnumAppend(left: PostgresPortableDatabaseTypeIdentity, right: PostgresPortableDatabaseTypeIdentity): boolean {
  if (left.kind !== 'enum' || right.kind !== 'enum' || !sameTypeName(left, right)) return false;
  const oldValues = left.enumValues ?? [];
  const newValues = right.enumValues ?? [];
  return oldValues.every((value, index) => newValues[index] === value) && newValues.length >= oldValues.length;
}

function isKnownPortableWidening(
  left: PostgresPortableDatabaseTypeIdentity,
  right: PostgresPortableDatabaseTypeIdentity,
): boolean {
  if (left.kind === 'array' && right.kind === 'array' && left.elementType && right.elementType) {
    return isKnownPortableWidening(left.elementType, right.elementType);
  }
  if (left.schema !== 'pg_catalog' || right.schema !== 'pg_catalog') return false;
  return (left.name === 'int2' && (right.name === 'int4' || right.name === 'int8'))
    || (left.name === 'int4' && right.name === 'int8');
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

function stablePortableTypeJson(value: PostgresPortableDatabaseTypeIdentity | undefined): string {
  if (!value) return 'undefined';
  return stableJson(portableTypeComparisonValue(value));
}

function portableTypeComparisonValue(value: PostgresPortableDatabaseTypeIdentity): unknown {
  return {
    schema: value.schema,
    name: value.name,
    kind: value.kind,
    category: value.category,
    ...(value.typeModifier !== undefined ? { typeModifier: value.typeModifier } : {}),
    ...(value.elementType ? { elementType: portableTypeComparisonValue(value.elementType) } : {}),
    ...(value.baseType ? { baseType: portableTypeComparisonValue(value.baseType) } : {}),
    ...(value.enumValues ? { enumValues: value.enumValues } : {}),
    ...(value.domainConstraints ? { domainConstraints: value.domainConstraints } : {}),
  };
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => [key, sortJson(entry)]));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
