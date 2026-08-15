import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import { compileNamedParameters } from '../parameter-metadata.js';
import {
  BinarySelectQuery,
  CreateTableQuery,
  DeleteQuery,
  InsertQuery,
  MultiQuerySplitter,
  RawString,
  LexemeCursor,
  SimpleSelectQuery,
  SqlFormatter,
  SqlParser,
  TableSource,
  TypeValue,
  UpdateQuery,
  type CommonTable,
  type ValueComponent,
  type Lexeme,
  type SelectQuery,
  type SourceExpression,
} from 'rawsql-ts';
import { extractSqlResultColumns, type SqlResultColumnContract } from './sql-result-columns.js';
import {
  analyzeQueryModel,
  buildPostgresOptionalConditionCompressionBindingMetadata,
  buildPostgresSafeSortBindingMetadata,
  buildQueryResultColumnContracts,
  type QueryModelBindings,
} from './model-gen.js';
import { loadDdlSchemaModel } from './ddl-schema-model.js';
import { loadProjectPathConfig } from './config.js';
import { formatSearchPath, resolveSchemaPathTable } from './schema-path.js';
import { DEFAULT_SQL_FORMAT_OPTIONS, resolveGeneratedSqlFormatOptions } from '../sql-format.js';
import { areTypeScriptTypesCompatible, inferSqlParameterTypes } from './sql-parameter-types.js';
import { astParseUserError, invalidCliInputError, requiredCliValueError } from '../errors.js';
import { collectTableReferences } from './table-resolution.js';
import { normalizeSqlSource } from '../sql-source.js';
import {
  derivePostgresQueryContractFromDatabase,
  parsePostgresDerivedQueryContract,
  type PostgresDerivedQueryContract,
  type PostgresDriverProfile,
  type PostgresDriverRepresentation,
  type PostgresContractResult,
} from './postgres-contract.js';

const FEATURE_SHARED_EXECUTOR_IMPORT_PATH = '#features/_shared/featureQueryExecutor.js';
const TEST_ZTD_CASE_TYPES_IMPORT_PATH = '#tests/support/ztd/case-types.js';
const TEST_ZTD_HARNESS_IMPORT_PATH = '#tests/support/ztd/harness.js';
const DRIVER_ADAPTER_CORE_PACKAGE = '@ashiba-ts/driver-adapter-core';
const DRIVER_ADAPTER_CORE_MIGRATION_WARNING = [
  'Warning: generated query boundaries import @ashiba-ts/driver-adapter-core directly.',
  'Add it as a direct application dependency before using the generated query code:',
  '',
  'npm install @ashiba-ts/driver-adapter-core',
].join('\n');

const FEATURE_ACTIONS = ['insert', 'update', 'delete', 'get-by-id', 'list'] as const;
type FeatureAction = (typeof FEATURE_ACTIONS)[number];
const INSERT_RETURNING_MODES = ['all', 'minimal'] as const;
type InsertReturningMode = (typeof INSERT_RETURNING_MODES)[number];
const defaultSqlFormatter = new SqlFormatter(DEFAULT_SQL_FORMAT_OPTIONS);

type OptimisticLockScaffoldConfig = {
  versionColumn: string;
  scaffold: 'off' | 'when-column-exists';
};

type OptimisticLockPlan = {
  versionColumn: string;
  expectedVersionParameter: string;
};

export interface FeatureScaffoldOptions {
  table?: string;
  action?: string;
  returning?: string;
  featureName?: string;
  rootDir?: string;
  dryRun?: boolean;
  force?: boolean;
}

export interface FeatureQueryScaffoldOptions {
  table?: string;
  action?: string;
  returning?: string;
  queryName?: string;
  feature?: string;
  boundaryDir?: string;
  featureRoot?: string;
  rootDir?: string;
  workingDir?: string;
  dryRun?: boolean;
  force?: boolean;
}

export interface FeatureImportOptions {
  sql?: string;
  queryName?: string;
  feature?: string;
  rootDir?: string;
  dryRun?: boolean;
  force?: boolean;
}

export interface FeatureQueryMetadataRefreshOptions {
  query?: string;
  feature?: string;
  boundaryDir?: string;
  featureRoot?: string;
  rootDir?: string;
  dryRun?: boolean;
  format?: 'text' | 'json';
}

export interface FeatureQueryPostgresContractOptions {
  query?: string;
  feature?: string;
  boundaryDir?: string;
  featureRoot?: string;
  rootDir?: string;
  databaseUrl?: string;
  databaseUrlEnv?: string;
  driverProfile?: string;
  dryRun?: boolean;
  format?: 'text' | 'json';
}

export interface FeatureTestsScaffoldOptions {
  feature?: string;
  boundaryDir?: string;
  featureRoot?: string;
  query?: string;
  rootDir?: string;
  dryRun?: boolean;
  force?: boolean;
}

export interface FeatureTestsCheckOptions {
  feature?: string;
  boundaryDir?: string;
  featureRoot?: string;
  query?: string;
  rootDir?: string;
  fix?: boolean;
  generatedOnly?: boolean;
  format?: 'text' | 'json';
}

export interface FeatureGeneratedMapperCheckOptions {
  feature?: string;
  boundaryDir?: string;
  featureRoot?: string;
  query?: string;
  rootDir?: string;
  format?: 'text' | 'json';
}

export interface FeatureScaffoldResult {
  featureName: string;
  queryName: string;
  action: FeatureAction;
  table: string;
  primaryKeyColumn: string;
  dryRun: boolean;
  warnings: string[];
  outputs: Array<{ path: string; written: boolean; kind: 'directory' | 'file' }>;
}

export interface FeatureImportResult {
  featureName: string;
  queryName: string;
  sourceSqlFile: string;
  importedSqlFile: string;
  dryRun: boolean;
  formatted: boolean;
  formatSkippedReason?: string;
  warnings: string[];
  outputs: Array<{ path: string; written: boolean; kind: 'directory' | 'file' }>;
}

export interface FeatureQueryMetadataRefreshResult {
  rootDir: string;
  featureName: string;
  queryName: string;
  sqlFile: string;
  queryFile: string;
  metadataFile: string;
  sqlSourceFile: string;
  dryRun: boolean;
  changed: boolean;
  changedFiles: string[];
}

export interface FeatureQueryPostgresContractResult {
  rootDir: string;
  featureName: string;
  queryName: string;
  sqlFile: string;
  contractFile: string;
  databaseUrlSource: string;
  dryRun: boolean;
  changed: boolean;
  changedFiles: string[];
  contract: PostgresDerivedQueryContract;
}

export interface FeatureGeneratedMapperCheckResult {
  rootDir: string;
  checked: Array<{
    feature: string;
    query: string;
    sqlFile: string;
    queryFile: string;
    sqlParameters: string[];
    mapperParameters: string[];
    sqlParameterTypes: Record<string, string>;
    mapperParameterTypes: Record<string, string>;
    mismatchedParameterTypes: string[];
    warningParameterTypeMismatches: string[];
    parameterTypeConflicts: string[];
    warningParameterTypeConflicts: string[];
    sqlResultColumns: string[];
    mapperResultColumns: string[];
    sqlResultTypes: Record<string, string>;
    mapperResultTypes: Record<string, string>;
    missingInMapper: string[];
    unusedInMapper: string[];
    missingResultInMapper: string[];
    unusedResultInMapper: string[];
    mismatchedResultTypes: string[];
    warningResultTypeMismatches: string[];
    postgresContractIssues: string[];
  }>;
  ok: boolean;
}

export interface FeatureTestsCheckResult {
  rootDir: string;
  fixed: boolean;
  checked: Array<{
    feature: string;
    query: string;
    ok: boolean;
    issues: string[];
    fixed: string[];
  }>;
  ok: boolean;
}

export interface FeatureGeneratedRefreshResult {
  rootDir: string;
  metadata: FeatureQueryMetadataRefreshResult[];
  tests?: FeatureTestsCheckResult;
  contract?: FeatureGeneratedMapperCheckResult;
  changedGeneratedFiles: string[];
  applicationOwnedIssues: string[];
}

interface DdlColumn {
  name: string;
  typeName: string;
  nullable: boolean;
  defaultValue?: string;
  generated: boolean;
  primaryKey: boolean;
}

interface DdlTable {
  schema: string;
  name: string;
  canonicalName: string;
  columns: DdlColumn[];
  primaryKeyColumns: string[];
}

interface RenderField {
  name: string;
  sourceName: string;
  typeScriptType: string;
  parserKind: 'string' | 'number' | 'boolean';
  nullable: boolean;
}

interface RenderContractField {
  name: string;
  typeScriptType: string;
  sqlType: string;
  nullability: ResultNullabilityLevel;
}

type ResultNullabilityLevel = 'nullable' | 'unknown' | 'non-null';

interface GeneratedFile {
  relativePath: string;
  contents?: string;
  kind: 'directory' | 'file';
  overwrite?: boolean;
}

interface QueryTestMetadata {
  feature: string;
  query: string;
  action?: FeatureAction;
  table?: string;
  primaryKeyColumn?: string;
  returningMode?: InsertReturningMode;
  optimisticLock?: OptimisticLockPlan;
  anchorSource?: string | null;
  anchorTable?: string | null;
  physicalTables?: string[];
  importSource?: 'existing-sql';
}

interface ResolvedQueryTestMetadata {
  metadata: QueryTestMetadata;
  inferred: boolean;
}

/**
 * Registers feature, query, metadata-refresh, and generated test scaffold commands.
 */
export function registerFeatureCommand(program: Command): void {
  const feature = program.command('feature').description('Scaffold editable feature-local SQL boundaries');
  const query = feature.command('query').description('Add query boundaries to an existing feature');
  const tests = feature.command('tests').description('Scaffold selective feature-local SQL logic tests');
  const contract = feature.command('contract').description('Check SQL and editable query contract drift');
  const generatedMapper = feature.command('generated-mapper').description('Deprecated alias for feature contract');

  feature
    .command('scaffold <name>')
    .description('Scaffold a feature-local CRUD or SELECT boundary from DDL metadata')
    .requiredOption('--table <table>', 'Target table name')
    .requiredOption('--action <action>', 'Action: insert, update, delete, get-by-id, or list')
    .option('--returning <mode>', 'Insert RETURNING shape: all or minimal. Defaults to all.', 'all')
    .option('--root-dir <path>', 'Project root directory', '.')
    .option('--dry-run', 'Print the files that would be created without writing them', false)
    .option('--force', 'Overwrite scaffold-owned files when they already exist', false)
    .action((featureName: string, options: FeatureScaffoldOptions) => {
      process.stdout.write(formatFeatureScaffoldResult('Feature scaffold', runFeatureScaffold({ ...options, featureName })));
    });

  feature
    .command('import <feature> <query>')
    .description('Import an existing visible SQL file into a feature query boundary')
    .requiredOption('--sql <path>', 'Existing SQL file to copy into the feature query boundary')
    .option('--root-dir <path>', 'Project root directory', '.')
    .option('--dry-run', 'Print the files that would be created without writing them', false)
    .option('--force', 'Overwrite scaffold-owned files when they already exist', false)
    .action((featureName: string, queryName: string, options: FeatureImportOptions) => {
      process.stdout.write(formatFeatureImportResult(runFeatureImport({ ...options, feature: featureName, queryName })));
    });

  query
    .command('scaffold <feature> <query>')
    .description('Scaffold one additive query boundary without rewriting parent orchestration')
    .requiredOption('--table <table>', 'Target table name')
    .requiredOption('--action <action>', 'Action: insert, update, delete, get-by-id, or list')
    .option('--returning <mode>', 'Insert RETURNING shape: all or minimal. Defaults to all.', 'all')
    .option('--root-dir <path>', 'Project root directory', '.')
    .option('--dry-run', 'Print the files that would be created without writing them', false)
    .option('--force', 'Overwrite scaffold-owned query files when they already exist', false)
    .action((featureName: string, queryName: string, options: FeatureQueryScaffoldOptions) => {
      process.stdout.write(formatFeatureScaffoldResult('Feature query scaffold', runFeatureQueryScaffold({
        ...options,
        feature: featureName,
        queryName,
      })));
    });

  query
    .command('refresh <feature> <query>')
    .description('Refresh query model metadata after editing visible SQL')
    .option('--root-dir <path>', 'Project root directory', '.')
    .option('--dry-run', 'Print the refresh result without writing generated query metadata', false)
    .option('--format <format>', 'Output format: text or json', 'text')
    .action((featureName: string, queryName: string, options: FeatureQueryMetadataRefreshOptions) => {
      const result = runFeatureQueryMetadataRefresh(withConfiguredFeatureRoot({ ...options, feature: featureName, query: queryName }));
      if (options.format === 'json') {
        process.stdout.write(`${JSON.stringify({ kind: 'feature-query-refresh', ...result }, null, 2)}\n`);
        return;
      }
      process.stdout.write(formatFeatureQueryMetadataRefresh(result));
    });

  query
    .command('postgres-contract <feature> <query>')
    .description('Validate visible SQL against PostgreSQL and generate a DB/driver query contract')
    .option('--database-url <url>', 'Development PostgreSQL connection URL; prefer --database-url-env in shared scripts')
    .option('--database-url-env <name>', 'Environment variable containing the development PostgreSQL URL', 'ASHIBA_POSTGRES_DATABASE_URL')
    .option('--driver-profile <profile>', 'node-postgres-default or custom:<stable-id>', 'node-postgres-default')
    .option('--root-dir <path>', 'Project root directory', '.')
    .option('--dry-run', 'Derive and print the contract without writing generated files', false)
    .option('--format <format>', 'Output format: text or json', 'text')
    .action(async (featureName: string, queryName: string, options: FeatureQueryPostgresContractOptions) => {
      const result = await runFeatureQueryPostgresContract(withConfiguredFeatureRoot({
        ...options,
        feature: featureName,
        query: queryName,
      }));
      if (options.format === 'json') {
        process.stdout.write(`${JSON.stringify({ kind: 'feature-query-postgres-contract', ...result }, null, 2)}\n`);
        return;
      }
      process.stdout.write(formatFeatureQueryPostgresContract(result));
    });

  tests
    .command('scaffold <feature>')
    .description('Scaffold selective human-owned SQL logic tests and generated fixture types')
    .option('--query <name>', 'Limit scaffolding to one query boundary')
    .option('--root-dir <path>', 'Project root directory', '.')
    .option('--dry-run', 'Print the files that would be created without writing them', false)
    .option('--force', 'Overwrite scaffold-owned test files when they already exist', false)
    .action((featureName: string, options: FeatureTestsScaffoldOptions) => {
      const result = runFeatureTestsScaffold(withConfiguredFeatureRoot({ ...options, feature: featureName }));
      process.stdout.write(formatFilePlan('Feature tests scaffold', result.rootDir, result.dryRun, result.outputs));
    });

  tests
    .command('check [feature]')
    .description('Detect missing or drifted support for explicitly scaffolded SQL logic tests')
    .option('--boundary-dir <path>', 'Explicit feature boundary directory, including subgrouped boundaries')
    .option('--query <name>', 'Limit check to one query boundary')
    .option('--root-dir <path>', 'Project root directory', '.')
    .option('--fix', 'Rewrite generated logic-test support and create missing logic-case stubs', false)
    .option('--format <format>', 'Output format: text or json', 'text')
    .action((featureName: string | undefined, options: FeatureTestsCheckOptions) => {
      const result = runFeatureTestsCheck(withConfiguredFeatureRoot({ ...options, feature: featureName ?? options.feature }));
      if (options.format === 'json') {
        process.stdout.write(`${JSON.stringify({ kind: 'feature-tests-check', ...result }, null, 2)}\n`);
        if (!result.ok) process.exitCode = 1;
        return;
      }
      process.stdout.write(formatFeatureTestsCheck(result));
      if (!result.ok) process.exitCode = 1;
    });

  registerFeatureContractCheck(contract, 'feature-contract-check');
  registerFeatureContractCheck(generatedMapper, 'feature-generated-mapper-check');
}

function registerFeatureContractCheck(parent: Command, kind: 'feature-contract-check' | 'feature-generated-mapper-check'): void {
  parent
    .command('check [feature]')
    .description('Check SQL named parameters and result columns against editable query contracts')
    .option('--boundary-dir <path>', 'Limit drift check to one explicit feature boundary directory, including subgrouped boundaries')
    .option('--query <name>', 'Limit drift check to one query boundary')
    .option('--root-dir <path>', 'Project root directory', '.')
    .option('--format <format>', 'Output format: text or json', 'text')
    .action((featureName: string | undefined, options: FeatureGeneratedMapperCheckOptions) => {
      const result = runFeatureGeneratedMapperCheck(withConfiguredFeatureRoot({ ...options, feature: featureName ?? options.feature }));
      if (options.format === 'json') {
        process.stdout.write(`${JSON.stringify({ kind, ...result }, null, 2)}\n`);
        if (!result.ok) process.exitCode = 1;
        return;
      }
      process.stdout.write(formatGeneratedMapperCheck(result));
      if (!result.ok) process.exitCode = 1;
    });
}

function withConfiguredFeatureRoot<T extends { rootDir?: string; featureRoot?: string }>(options: T): T {
  if (options.featureRoot && options.featureRoot.trim().length > 0) {
    return options;
  }
  const rootDir = path.resolve(options.rootDir ?? '.');
  return {
    ...options,
    featureRoot: loadProjectPathConfig(rootDir).featureRoot,
  };
}

/**
 * Scaffolds an editable RFBA-style feature boundary from DDL and query metadata.
 */
export function runFeatureScaffold(options: FeatureScaffoldOptions): FeatureScaffoldResult {
  const rootDir = path.resolve(options.rootDir ?? '.');
  const action = normalizeFeatureAction(options.action);
  const returningMode = normalizeInsertReturningMode(options.returning, action);
  const projectConfig = loadProjectPathConfig(rootDir);
  const table = loadDdlTable(rootDir, requireValue(options.table, '--table'));
  const primaryKeyColumn = resolvePrimaryKeyColumn(table);
  const featureName = normalizeFeatureName(options.featureName ?? `${toKebab(table.name)}-${action}`);
  const queryName = deriveQueryName(table.name, action);
  const files = buildFeatureFiles(rootDir, featureName, queryName, action, table, primaryKeyColumn, returningMode, projectConfig.mutation.optimisticLock, projectConfig.featureRoot);
  const outputs = writeGeneratedFiles(rootDir, files, options.dryRun === true, options.force === true);
  const warnings = getFeatureQueryBoundaryDependencyWarnings(rootDir);

  return {
    featureName,
    queryName,
    action,
    table: table.canonicalName,
    primaryKeyColumn,
    dryRun: options.dryRun === true,
    warnings,
    outputs,
  };
}

/**
 * Adds a query boundary to an existing feature and generates its metadata.
 */
export function runFeatureQueryScaffold(options: FeatureQueryScaffoldOptions): FeatureScaffoldResult {
  const rootDir = path.resolve(options.rootDir ?? '.');
  const action = normalizeFeatureAction(options.action);
  const returningMode = normalizeInsertReturningMode(options.returning, action);
  const projectConfig = loadProjectPathConfig(rootDir);
  const table = loadDdlTable(rootDir, requireValue(options.table, '--table'));
  const primaryKeyColumn = resolvePrimaryKeyColumn(table);
  const queryName = normalizeQueryName(options.queryName);
  const boundaryDir = resolveBoundaryDir(rootDir, { ...options, featureRoot: projectConfig.featureRoot });
  const relativeBoundary = toProjectPath(rootDir, boundaryDir);

  if (!existsSync(path.join(boundaryDir, 'boundary.ts'))) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_BOUNDARY_FILE_MISSING',
      `Boundary directory must contain boundary.ts: ${relativeBoundary}.`,
      'Run feature scaffold first, then pass the feature name to feature query scaffold.',
      { boundaryDir: relativeBoundary },
    );
  }

  const files = buildQueryFiles(rootDir, relativeBoundary, queryName, action, table, primaryKeyColumn, returningMode, projectConfig.mutation.optimisticLock);
  const outputs = writeGeneratedFiles(rootDir, files, options.dryRun === true, options.force === true);
  const featureName = path.basename(boundaryDir);
  const warnings = getFeatureQueryBoundaryDependencyWarnings(rootDir);

  return {
    featureName,
    queryName,
    action,
    table: table.canonicalName,
    primaryKeyColumn,
    dryRun: options.dryRun === true,
    warnings,
    outputs,
  };
}

/**
 * Imports an existing visible SQL file into a feature boundary and generates editable mapper assets.
 */
export function runFeatureImport(options: FeatureImportOptions): FeatureImportResult {
  const rootDir = path.resolve(options.rootDir ?? '.');
  const featureName = normalizeFeatureName(requireValue(options.feature, '<feature>'));
  const queryName = normalizeQueryName(options.queryName);
  const sourceSqlPath = path.resolve(rootDir, requireValue(options.sql, '--sql'));
  if (!existsSync(sourceSqlPath) || !statSync(sourceSqlPath).isFile()) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_IMPORT_SQL_NOT_FOUND',
      `SQL file was not found for feature import: ${toProjectPath(rootDir, sourceSqlPath)}.`,
      'Pass --sql as a path to an existing SQL file.',
      { sqlFile: toProjectPath(rootDir, sourceSqlPath) },
    );
  }
  const sourceSql = readFileSync(sourceSqlPath, 'utf8');
  const formatted = formatImportedSqlSafely(sourceSql, rootDir);
  const importedSql = formatted.sql;
  const projectConfig = loadProjectPathConfig(rootDir);
  const featureRoot = projectConfig.featureRoot;
  const relativeFeatureDir = `${featureRoot}/${featureName}`;
  const relativeQueryDir = `${relativeFeatureDir}/queries/${queryName}`;
  const queryModel = buildFeatureQueryModel(importedSql, rootDir);
  const resultColumnContracts = buildQueryResultColumnContracts(importedSql, rootDir);
  const parameterTypes = queryModel.analysis.parameterTypes ?? {};
  const parameters = queryModel.analysis.namedParameters;
  const files: GeneratedFile[] = [
    ...buildSharedFiles(featureRoot),
    ...buildImportedFeatureFiles(relativeFeatureDir, featureName, queryName, parameters, parameterTypes, resultColumnContracts),
    { relativePath: relativeQueryDir, kind: 'directory' },
    {
      relativePath: `${relativeQueryDir}/${queryName}.sql`,
      kind: 'file',
      contents: importedSql,
    },
    {
      relativePath: `${relativeQueryDir}/query.ts`,
      kind: 'file',
      contents: renderImportedQueryBoundary(
        queryName,
        parameters,
        parameterTypes,
        resultColumnContracts,
        queryModel.analysis.optionalConditionCompression?.enabled === true,
        queryModel.analysis.astParse === 'failed',
      ),
    },
    { relativePath: `${relativeQueryDir}/generated`, kind: 'directory' },
    {
      relativePath: `${relativeQueryDir}/generated/query.meta.ts`,
      kind: 'file',
      contents: renderQueryMetadata(queryModel),
      overwrite: true,
    },
    {
      relativePath: `${relativeQueryDir}/generated/query.sql.ts`,
      kind: 'file',
      contents: renderQuerySqlSource(importedSql),
      overwrite: true,
    },
  ];
  const outputs = writeGeneratedFiles(rootDir, files, options.dryRun === true, options.force === true);
  const warnings = getFeatureQueryBoundaryDependencyWarnings(rootDir);
  return {
    featureName,
    queryName,
    sourceSqlFile: toProjectPath(rootDir, sourceSqlPath),
    importedSqlFile: `${relativeQueryDir}/${queryName}.sql`,
    dryRun: options.dryRun === true,
    formatted: formatted.formatted,
    ...(formatted.reason ? { formatSkippedReason: formatted.reason } : {}),
    warnings,
    outputs,
  };
}

/**
 * Refreshes the generated query metadata file after a SQL-only edit.
 */
export function runFeatureQueryMetadataRefresh(options: FeatureQueryMetadataRefreshOptions): FeatureQueryMetadataRefreshResult {
  const rootDir = path.resolve(options.rootDir ?? '.');
  const featureRoot = options.featureRoot ?? loadProjectPathConfig(rootDir).featureRoot;
  const boundaryDir = resolveExplicitFeatureBoundaryDir(rootDir, options.feature, options.boundaryDir, 'feature query refresh', featureRoot);
  const featureName = path.basename(boundaryDir);
  const queryName = normalizeQueryName(requireValue(options.query, '--query'));
  const queryDir = path.join(boundaryDir, 'queries', queryName);
  const sqlPath = path.join(queryDir, `${queryName}.sql`);
  const queryPath = path.join(queryDir, 'query.ts');
  const metadataPath = path.join(queryDir, 'generated', 'query.meta.ts');
  const sqlSourcePath = path.join(queryDir, 'generated', 'query.sql.ts');
  if (!existsSync(sqlPath)) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_QUERY_SQL_NOT_FOUND',
      `SQL file was not found for query metadata refresh: ${toProjectPath(rootDir, sqlPath)}.`,
      'Run feature query scaffold first, or pass the correct feature and query positional values.',
      { sqlFile: toProjectPath(rootDir, sqlPath) },
    );
  }
  if (!existsSync(queryPath)) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_QUERY_BOUNDARY_NOT_FOUND',
      `Query file was not found for query metadata refresh: ${toProjectPath(rootDir, queryPath)}.`,
      'Run feature query scaffold first, or recreate the query file before refreshing metadata.',
      { queryFile: toProjectPath(rootDir, queryPath) },
    );
  }

  const sql = normalizeSqlSource(readFileSync(sqlPath, 'utf8'));
  const queryModel = buildFeatureQueryModel(sql, rootDir, loadGeneratedPostgresContract(queryDir));
  const refreshedSource = renderQueryMetadata(queryModel);
  const refreshedSqlSource = renderQuerySqlSource(sql);
  const existingSource = existsSync(metadataPath) ? readFileSync(metadataPath, 'utf8') : '';
  const existingSqlSource = existsSync(sqlSourcePath) ? readFileSync(sqlSourcePath, 'utf8') : '';
  const metadataChanged = refreshedSource !== existingSource;
  const sqlSourceChanged = refreshedSqlSource !== existingSqlSource;
  const changed = metadataChanged || sqlSourceChanged;
  if (!options.dryRun && changed) {
    mkdirSync(path.dirname(metadataPath), { recursive: true });
    if (metadataChanged) {
      writeFileSync(metadataPath, refreshedSource, 'utf8');
    }
    if (sqlSourceChanged) {
      writeFileSync(sqlSourcePath, refreshedSqlSource, 'utf8');
    }
  }

  return {
    rootDir,
    featureName,
    queryName,
    sqlFile: toProjectPath(rootDir, sqlPath),
    queryFile: toProjectPath(rootDir, queryPath),
    metadataFile: toProjectPath(rootDir, metadataPath),
    sqlSourceFile: toProjectPath(rootDir, sqlSourcePath),
    dryRun: options.dryRun === true,
    changed,
    changedFiles: [
      ...(metadataChanged ? [toProjectPath(rootDir, metadataPath)] : []),
      ...(sqlSourceChanged ? [toProjectPath(rootDir, sqlSourcePath)] : []),
    ],
  };
}

/**
 * Uses a development PostgreSQL instance as an optional, non-executing type
 * oracle and stores the deterministic result beside the VSA-local query.
 */
export async function runFeatureQueryPostgresContract(
  options: FeatureQueryPostgresContractOptions,
): Promise<FeatureQueryPostgresContractResult> {
  const rootDir = path.resolve(options.rootDir ?? '.');
  const featureRoot = options.featureRoot ?? loadProjectPathConfig(rootDir).featureRoot;
  const boundaryDir = resolveExplicitFeatureBoundaryDir(
    rootDir,
    options.feature,
    options.boundaryDir,
    'feature query postgres-contract',
    featureRoot,
  );
  const featureName = path.basename(boundaryDir);
  const queryName = normalizeQueryName(requireValue(options.query, '--query'));
  const queryDir = path.join(boundaryDir, 'queries', queryName);
  const sqlPath = path.join(queryDir, `${queryName}.sql`);
  const queryPath = path.join(queryDir, 'query.ts');
  if (!existsSync(sqlPath) || !existsSync(queryPath)) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_QUERY_BOUNDARY_NOT_FOUND',
      `Feature query boundary was not found: ${toProjectPath(rootDir, queryDir)}.`,
      'Run feature query scaffold/import first, or pass the correct feature and query names.',
      { queryDir: toProjectPath(rootDir, queryDir) },
    );
  }
  const { connectionString, source: databaseUrlSource } = resolvePostgresContractDatabaseUrl(options);
  const driverProfile = parsePostgresDriverProfile(options.driverProfile);
  const sql = normalizeSqlSource(readFileSync(sqlPath, 'utf8'));
  const offlineModel = buildFeatureQueryModel(sql, rootDir);
  const binding = offlineModel.bindings.postgres;
  const contract = await derivePostgresQueryContractFromDatabase(connectionString, {
    sql,
    compiledSql: binding.sql,
    parameterNames: binding.orderedNames,
    resultColumnOrder: offlineModel.analysis.resultColumnOrder,
    resultColumnNullability: offlineModel.analysis.resultColumnNullability,
    driverProfile,
  });
  const contractPath = path.join(queryDir, 'generated', 'postgres.contract.json');
  const contractContents = `${JSON.stringify(contract, null, 2)}\n`;
  const existingContract = existsSync(contractPath) ? readFileSync(contractPath, 'utf8') : '';
  const contractChanged = existingContract !== contractContents;
  const changedFiles: string[] = [];
  if (!options.dryRun && contractChanged) {
    mkdirSync(path.dirname(contractPath), { recursive: true });
    writeFileSync(contractPath, contractContents, 'utf8');
    changedFiles.push(toProjectPath(rootDir, contractPath));
  }
  if (!options.dryRun) {
    const refresh = runFeatureQueryMetadataRefresh({
      rootDir,
      featureRoot,
      boundaryDir,
      query: queryName,
    });
    changedFiles.push(...refresh.changedFiles);
  }
  return {
    rootDir,
    featureName,
    queryName,
    sqlFile: toProjectPath(rootDir, sqlPath),
    contractFile: toProjectPath(rootDir, contractPath),
    databaseUrlSource,
    dryRun: options.dryRun === true,
    changed: contractChanged || changedFiles.length > 0,
    changedFiles: [...new Set(changedFiles)].sort(),
    contract,
  };
}

function resolvePostgresContractDatabaseUrl(options: FeatureQueryPostgresContractOptions): {
  connectionString: string;
  source: string;
} {
  const explicit = options.databaseUrl?.trim();
  if (explicit) return { connectionString: explicit, source: '--database-url' };
  const environmentName = options.databaseUrlEnv?.trim() || 'ASHIBA_POSTGRES_DATABASE_URL';
  const environmentValue = process.env[environmentName]?.trim();
  if (environmentValue) return { connectionString: environmentValue, source: environmentName };
  throw invalidCliInputError(
    'ASHIBA_POSTGRES_DATABASE_URL_REQUIRED',
    `PostgreSQL query contract requires --database-url or a non-empty ${environmentName} environment variable.`,
    'Point the command at a development/test PostgreSQL database. Do not use a production database.',
    { databaseUrlEnv: environmentName },
  );
}

function parsePostgresDriverProfile(value: string | undefined): PostgresDriverProfile {
  const profile = value?.trim() || 'node-postgres-default';
  if (profile === 'node-postgres-default') return profile;
  if (profile.startsWith('custom:') && profile.slice('custom:'.length).trim().length > 0) {
    return `custom:${profile.slice('custom:'.length).trim()}`;
  }
  throw invalidCliInputError(
    'ASHIBA_POSTGRES_DRIVER_PROFILE_INVALID',
    `Invalid PostgreSQL driver profile: ${profile}.`,
    'Use node-postgres-default or custom:<stable-id>. Custom profiles deliberately generate unknown driver value types.',
    { driverProfile: profile },
  );
}

function loadGeneratedPostgresContract(queryDir: string): PostgresDerivedQueryContract | undefined {
  const contractPath = path.join(queryDir, 'generated', 'postgres.contract.json');
  if (!existsSync(contractPath)) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(contractPath, 'utf8'));
  } catch (error) {
    throw invalidCliInputError(
      'ASHIBA_POSTGRES_CONTRACT_INVALID',
      `Generated PostgreSQL query contract is not valid JSON: ${contractPath}.`,
      'Rerun feature query postgres-contract against a development PostgreSQL database.',
      { contractPath, reason: error instanceof Error ? error.message : String(error) },
    );
  }
  try {
    return parsePostgresDerivedQueryContract(parsed);
  } catch (error) {
    throw invalidCliInputError(
      'ASHIBA_POSTGRES_CONTRACT_INVALID',
      `Generated PostgreSQL query contract has an invalid shape: ${contractPath}.`,
      'Rerun feature query postgres-contract against a development PostgreSQL database.',
      { contractPath, reason: error instanceof Error ? error.message : String(error) },
    );
  }
}

/**
 * Refresh every safe library-owned query artifact in one deterministic pass.
 * Visible SQL, query.ts, and human-owned logic cases are never rewritten.
 */
export function runFeatureGeneratedRefresh(options: {
  rootDir?: string;
  featureRoot?: string;
} = {}): FeatureGeneratedRefreshResult {
  const rootDir = path.resolve(options.rootDir ?? '.');
  const featureRoot = options.featureRoot ?? loadProjectPathConfig(rootDir).featureRoot;
  const metadata: FeatureQueryMetadataRefreshResult[] = [];
  for (const boundary of discoverFeatureBoundaries(rootDir, undefined, undefined, featureRoot)) {
    const queriesDir = path.join(boundary.dir, 'queries');
    if (!existsSync(queriesDir) || !statSync(queriesDir).isDirectory()) continue;
    for (const queryName of discoverQueryNames(queriesDir)) {
      metadata.push(runFeatureQueryMetadataRefresh({
        rootDir,
        featureRoot,
        boundaryDir: boundary.dir,
        query: queryName,
      }));
    }
  }

  let tests: FeatureTestsCheckResult | undefined;
  try {
    tests = runFeatureTestsCheck({ rootDir, featureRoot, fix: true, generatedOnly: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('No feature query test boundaries were discovered')) throw error;
  }
  const changedGeneratedFiles = [
    ...metadata.flatMap((entry) => entry.changedFiles),
    ...(tests?.checked.flatMap((entry) => entry.fixed) ?? []),
  ].filter((value, index, values) => values.indexOf(value) === index).sort();
  const fixed = new Set(tests?.checked.flatMap((entry) => entry.fixed) ?? []);
  let contract: FeatureGeneratedMapperCheckResult | undefined;
  try {
    contract = runFeatureGeneratedMapperCheck({ rootDir, featureRoot });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('No feature query boundaries were discovered')) throw error;
  }
  const contractIssues = contract?.checked.flatMap((entry) => [
    ...entry.missingInMapper.map((name) => `${entry.queryFile}: add parameter ${name} required by visible SQL.`),
    ...entry.unusedInMapper.map((name) => `${entry.queryFile}: remove parameter ${name}; it is absent from visible SQL.`),
    ...entry.mismatchedParameterTypes.map((message) => `${entry.queryFile}: fix parameter type ${message}.`),
    ...entry.parameterTypeConflicts.map((message) => `${entry.queryFile}: resolve parameter type conflict ${message}.`),
    ...entry.missingResultInMapper.map((name) => `${entry.queryFile}: add result column ${name} projected by visible SQL.`),
    ...entry.unusedResultInMapper.map((name) => `${entry.queryFile}: remove result column ${name}; it is absent from visible SQL.`),
    ...entry.mismatchedResultTypes.map((message) => `${entry.queryFile}: fix result type ${message}.`),
    ...entry.postgresContractIssues.map((message) => `${entry.queryFile}: ${message}`),
  ]) ?? [];
  const applicationOwnedIssues = [
    ...(tests?.checked.flatMap((entry) => entry.issues) ?? [])
    .filter((issue) => ![...fixed].some((file) => issue.includes(file)))
    ,
    ...contractIssues,
  ].sort();
  return {
    rootDir,
    metadata,
    ...(tests ? { tests } : {}),
    ...(contract ? { contract } : {}),
    changedGeneratedFiles,
    applicationOwnedIssues,
  };
}

/**
 * Scaffolds selective human-owned logic tests for existing feature queries.
 */
export function runFeatureTestsScaffold(options: FeatureTestsScaffoldOptions): {
  rootDir: string;
  dryRun: boolean;
  outputs: Array<{ path: string; written: boolean; kind: 'directory' | 'file' }>;
} {
  const rootDir = path.resolve(options.rootDir ?? '.');
  const featureDir = resolveExplicitFeatureBoundaryDir(
    rootDir,
    options.feature,
    options.boundaryDir,
    'feature tests scaffold',
    options.featureRoot,
  );
  const featureName = path.basename(featureDir);
  const relativeFeatureDir = toProjectPath(rootDir, featureDir);
  const queriesDir = path.join(featureDir, 'queries');
  if (!existsSync(queriesDir) || !statSync(queriesDir).isDirectory()) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_QUERIES_DIR_MISSING',
      `No queries directory was discovered under ${relativeFeatureDir}. Run feature scaffold first.`,
      'Run feature scaffold or feature query scaffold before creating query tests.',
      { featureName, boundaryDir: relativeFeatureDir },
    );
  }

  const queryNames = options.query ? [normalizeQueryName(options.query)] : readdirSync(queriesDir).filter((entry) => {
    const fullPath = path.join(queriesDir, entry);
    return statSync(fullPath).isDirectory();
  });

  const files: GeneratedFile[] = [
    {
      relativePath: `${relativeFeatureDir}/tests/${featureName}.boundary.test.ts`,
      kind: 'file',
      contents: renderFeatureBoundaryTest(featureName),
      overwrite: false,
    },
  ];

  for (const queryName of queryNames) {
    const queryDir = path.join(queriesDir, queryName);
    if (!existsSync(queryDir)) {
      throw invalidCliInputError(
        'ASHIBA_FEATURE_QUERY_DIR_MISSING',
        `Query directory not found for tests scaffold: ${queryName}.`,
        'Check --query or run feature query scaffold for this query before creating tests.',
        { featureName, queryName },
      );
    }
    const generatedFiles = buildExpectedLogicTestSupportFiles(
      rootDir,
      relativeFeatureDir,
      featureName,
      queryName,
      queryDir,
    );
    files.push(
      { relativePath: `${relativeFeatureDir}/queries/${queryName}/tests`, kind: 'directory' },
      { relativePath: `${relativeFeatureDir}/queries/${queryName}/tests/cases`, kind: 'directory' },
      ...generatedFiles,
      {
        relativePath: `${relativeFeatureDir}/queries/${queryName}/tests/cases/logic.case.ts`,
        kind: 'file',
        contents: renderEmptyLogicZtdCases(queryName),
        overwrite: false,
      },
      { relativePath: `${relativeFeatureDir}/queries/${queryName}/tests/cases/.gitkeep`, kind: 'file', contents: '', overwrite: false },
    );
  }

  const outputs = writeGeneratedFiles(rootDir, files, options.dryRun === true, options.force === true);
  return { rootDir, dryRun: options.dryRun === true, outputs };
}

/**
 * Checks only explicitly scaffolded SQL logic-test support.
 */
export function runFeatureTestsCheck(options: FeatureTestsCheckOptions = {}): FeatureTestsCheckResult {
  const rootDir = path.resolve(options.rootDir ?? '.');
  const featureBoundaries = discoverFeatureBoundaries(rootDir, options.feature, options.boundaryDir, options.featureRoot);
  const checked: FeatureTestsCheckResult['checked'] = [];

  for (const { name: featureName, dir: featureDir } of featureBoundaries) {
    const queriesDir = path.join(featureDir, 'queries');
    if (!existsSync(queriesDir) || !statSync(queriesDir).isDirectory()) continue;
    for (const queryName of discoverQueryNames(queriesDir, options.query)) {
      const queryDir = path.join(queriesDir, queryName);
      const relativeQueryDir = toProjectPath(rootDir, queryDir);
      const logicCasePath = `${relativeQueryDir}/tests/cases/logic.case.ts`;
      const boundaryTestPath = `${relativeQueryDir}/tests/${queryName}.boundary.ztd.test.ts`;
      const fixtureTypesPath = `${relativeQueryDir}/tests/boundary-ztd-types.ts`;
      const hasScaffold = [logicCasePath, boundaryTestPath, fixtureTypesPath]
        .some((relativePath) => existsSync(path.join(rootDir, relativePath)));
      if (!hasScaffold) continue;

      const issues: string[] = [];
      const fixed: string[] = [];
      const expectedFiles = buildExpectedLogicTestSupportFiles(
        rootDir,
        toProjectPath(rootDir, featureDir),
        featureName,
        queryName,
        queryDir,
      );
      for (const file of expectedFiles) {
        const fullPath = path.join(rootDir, file.relativePath);
        const expected = file.contents ?? '';
        if (!existsSync(fullPath)) {
          issues.push(`Missing generated logic-test support: ${file.relativePath}.`);
          if (options.fix) fixed.push(file.relativePath);
          continue;
        }
        if (readFileSync(fullPath, 'utf8') !== expected) {
          issues.push(`Drifted generated logic-test support: ${file.relativePath}.`);
          if (options.fix) fixed.push(file.relativePath);
        }
      }

      if (!existsSync(path.join(rootDir, logicCasePath))) {
        issues.push(`Missing human-owned logic case stub: ${logicCasePath}.`);
        if (options.fix && options.generatedOnly !== true) fixed.push(logicCasePath);
      }

      if (options.fix && fixed.length > 0) {
        writeGeneratedFiles(rootDir, expectedFiles, false, true);
        if (options.generatedOnly !== true && !existsSync(path.join(rootDir, logicCasePath))) {
          writeGeneratedFiles(rootDir, [{
            relativePath: logicCasePath,
            kind: 'file',
            contents: renderEmptyLogicZtdCases(queryName),
            overwrite: false,
          }], false, false);
        }
      }

      checked.push({
        feature: featureName,
        query: queryName,
        ok: issues.length === 0 || (options.fix === true && fixed.length === issues.length),
        issues,
        fixed,
      });
    }
  }

  if (checked.length === 0) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_QUERY_TESTS_NOT_FOUND',
      'No feature query test boundaries were discovered for tests check.',
      'Run feature tests scaffold for a selected query first, or pass a feature positional value, --boundary-dir, or --query that already has logic-test support.',
      { rootDir },
    );
  }

  return {
    rootDir,
    fixed: options.fix === true,
    checked,
    ok: checked.every((entry) => entry.ok),
  };
}

/**
 * Checks editable query contracts against SQL- and DDL-derived expectations.
 */
export function runFeatureGeneratedMapperCheck(options: FeatureGeneratedMapperCheckOptions = {}): FeatureGeneratedMapperCheckResult {
  const rootDir = path.resolve(options.rootDir ?? '.');
  const featureBoundaries = discoverFeatureBoundaries(rootDir, options.feature, options.boundaryDir, options.featureRoot);
  const ddlModel = loadDdlSchemaModel(rootDir);
  const schemaPath = loadProjectPathConfig(rootDir);
  const checked: FeatureGeneratedMapperCheckResult['checked'] = [];

  for (const { name: featureName, dir: featureDir } of featureBoundaries) {
    const queriesDir = path.join(featureDir, 'queries');
    if (!existsSync(queriesDir)) {
      continue;
    }
    const queryNames = discoverQueryNames(queriesDir, options.query);
    for (const queryName of queryNames) {
      const queryDir = path.join(queriesDir, queryName);
      const sqlFile = path.join(queryDir, `${queryName}.sql`);
      const queryFile = path.join(queryDir, 'query.ts');
      if (!existsSync(sqlFile) || !existsSync(queryFile)) {
        continue;
      }
      const sql = normalizeSqlSource(readFileSync(sqlFile, 'utf8'));
      const postgresContract = loadGeneratedPostgresContract(queryDir);
      const postgresContractStale = postgresContract !== undefined && postgresContract.sourceHash !== hashSql(sql);
      const postgresContractIssues = postgresContractStale
        ? ['generated/postgres.contract.json is stale; rerun feature query postgres-contract.']
        : [];
      const sqlParameters = [...new Set(compileNamedParameters(sql).orderedNames)].sort();
      const querySource = readFileSync(queryFile, 'utf8');
      const mapperParameters = extractMapperParameters(querySource, queryName).sort();
      const mapperParameterTypes = extractMapperParameterTypes(querySource, queryName);
      const parameterInference = inferSqlParameterTypes(sql, ddlModel, schemaPath);
      const sqlParameterTypes = parameterInference?.parameterTypes ?? {};
      const certainParameters = new Set(
        parameterInference?.certainParameters ?? []
      );
      const offlineMismatchedParameterTypes = Object.entries(sqlParameterTypes)
        .filter(([parameter]) => mapperParameters.includes(parameter))
        .filter(([parameter]) => certainParameters.has(parameter))
        .filter(([parameter, expectedType]) => !areTypeScriptTypesCompatible(mapperParameterTypes[parameter] ?? 'unknown', expectedType))
        .map(([parameter, expectedType]) => `${parameter}: mapper ${mapperParameterTypes[parameter] ?? 'unknown'} / SQL ${expectedType}`);
      const postgresParameterTypes = !postgresContractStale && postgresContract
        ? Object.fromEntries(
          postgresContract.driver.parameters
            .filter((field): field is PostgresDriverRepresentation & { name: string } => typeof field.name === 'string')
            .map((field) => [field.name, field.typeScriptType]),
        )
        : {};
      const postgresParameterTypeMismatches = Object.entries(postgresParameterTypes)
        .filter(([parameter, expectedType]) =>
          mapperParameters.includes(parameter)
          && expectedType !== 'unknown'
          && !isParameterTypeCoveredByDriverContract(mapperParameterTypes[parameter] ?? 'unknown', expectedType))
        .map(([parameter, expectedType]) =>
          `${parameter}: mapper ${mapperParameterTypes[parameter] ?? 'unknown'} / node-postgres input ${expectedType}`);
      const mismatchedParameterTypes = [...new Set([
        ...offlineMismatchedParameterTypes,
        ...postgresParameterTypeMismatches,
      ])];
      const warningParameterTypeMismatches = Object.entries(sqlParameterTypes)
        .filter(([parameter]) => mapperParameters.includes(parameter))
        .filter(([parameter]) => !certainParameters.has(parameter))
        .filter(([parameter, expectedType]) => !areTypeScriptTypesCompatible(mapperParameterTypes[parameter] ?? 'unknown', expectedType))
        .map(([parameter, expectedType]) => `${parameter}: mapper ${mapperParameterTypes[parameter] ?? 'unknown'} / SQL ${expectedType}`);
      const parameterTypeConflicts = parameterInference?.conflicts
        .filter((conflict) => conflict.bindings.every((binding) => binding.confidence === 'certain'))
        .map((conflict) =>
        `${conflict.parameter}: ${conflict.bindings.map((binding) => `${binding.table}.${binding.column} ${binding.typeScriptType}`).join(', ')}`
      ) ?? [];
      const warningParameterTypeConflicts = parameterInference?.conflicts
        .filter((conflict) => conflict.bindings.some((binding) => binding.confidence !== 'certain'))
        .map((conflict) =>
        `${conflict.parameter}: ${conflict.bindings.map((binding) => `${binding.table}.${binding.column} ${binding.typeScriptType}`).join(', ')}`
      ) ?? [];
      const sqlResultContracts = buildQueryResultColumnContracts(sql, rootDir);
      const postgresResultFields = !postgresContractStale && postgresContract
        ? postgresContract.driver.results.filter(
          (field): field is PostgresDriverRepresentation & { name: string } => typeof field.name === 'string',
        )
        : [];
      const offlineSqlResultColumns = sqlResultContracts.map((column) => column.name).sort();
      const sqlResultColumns = postgresResultFields.length === postgresContract?.driver.results.length
        ? postgresResultFields.map((field) => field.name).sort()
        : offlineSqlResultColumns;
      const mapperResultColumns = extractMapperResultColumns(querySource, queryName).sort();
      const queryTestMetadata = resolveQueryTestMetadata(rootDir, featureName, queryName, queryDir)?.metadata;
      const resultTypesShouldBeConservative = queryTestMetadata?.importSource === 'existing-sql';
      const importedDdlTableName = queryTestMetadata?.importSource === 'existing-sql'
        ? queryTestMetadata.anchorTable ?? queryTestMetadata.table
        : undefined;
      const importedDdlTable = importedDdlTableName
        ? loadOptionalDdlTable(rootDir, importedDdlTableName)
        : undefined;
      const importedResultNullability = resultTypesShouldBeConservative
        ? inferImportedResultNullabilityByColumn(sqlResultContracts, importedDdlTable)
        : {};
      const resultNullabilityByColumn: Record<string, ResultNullabilityLevel> = {
        ...Object.fromEntries(sqlResultContracts.map((column) => [
          column.name,
          importedResultNullability[column.name] ?? column.nullability,
        ])),
        ...Object.fromEntries((!postgresContractStale && postgresContract
          ? postgresContract.database.results
          : [])
          .filter((field): field is PostgresContractResult & { name: string } => typeof field.name === 'string')
          .map((field) => [field.name, field.nullability.value])),
      };
      const metadataResultTypeOverrides = queryTestMetadata
        ? buildMetadataBackedResultTypeOverrides(rootDir, queryTestMetadata)
        : undefined;
      const offlineSqlResultTypes: Record<string, string> = Object.fromEntries(
        sqlResultContracts
          .map((column): [string, string] => {
            const nullability = resultNullabilityByColumn[column.name] ?? 'unknown';
            const contractType = nullability !== 'non-null'
              ? makeConservativeNullableType(column.type)
              : column.type;
            const metadataType = metadataResultTypeOverrides?.[column.name];
            return [
              column.name,
              metadataType && shouldPreferMetadataBackedResultType(metadataType, contractType) ? metadataType : contractType,
            ];
          })
          .sort(([left], [right]) => left.localeCompare(right)),
      );
      const sqlResultTypes: Record<string, string> = {
        ...offlineSqlResultTypes,
        ...Object.fromEntries(postgresResultFields.map((field) => [field.name, field.typeScriptType])),
      };
      const mapperResultTypes = extractMapperResultTypes(querySource, queryName);
      const missingInMapper = sqlParameters.filter((parameter) => !mapperParameters.includes(parameter));
      const unusedInMapper = mapperParameters.filter((parameter) => !sqlParameters.includes(parameter));
      const missingResultInMapper = sqlResultColumns.filter((column) => !mapperResultColumns.includes(column));
      const unusedResultInMapper = mapperResultColumns.filter((column) => !sqlResultColumns.includes(column));
      const resultTypeDrifts = Object.entries(sqlResultTypes)
        .filter(([column]) => mapperResultColumns.includes(column))
        .map(([column, expectedType]) => classifyResultTypeDrift({
          column,
          mapperType: mapperResultTypes[column] ?? 'unknown',
          expectedSqlType: expectedType,
          nullability: resultNullabilityByColumn[column] ?? 'non-null',
        }))
        .filter((drift): drift is ResultTypeDrift => Boolean(drift));
      const mismatchedResultTypes = resultTypeDrifts
        .filter((drift) => drift.severity === 'error')
        .map((drift) => drift.message);
      const warningResultTypeMismatches = resultTypeDrifts
        .filter((drift) => drift.severity === 'warning')
        .map((drift) => drift.message);
      checked.push({
        feature: featureName,
        query: queryName,
        sqlFile: toProjectPath(rootDir, sqlFile),
        queryFile: toProjectPath(rootDir, queryFile),
        sqlParameters,
        mapperParameters,
        sqlParameterTypes,
        mapperParameterTypes,
        mismatchedParameterTypes,
        warningParameterTypeMismatches,
        parameterTypeConflicts,
        warningParameterTypeConflicts,
        sqlResultColumns,
        mapperResultColumns,
        sqlResultTypes,
        mapperResultTypes,
        missingInMapper,
        unusedInMapper,
        missingResultInMapper,
        unusedResultInMapper,
        mismatchedResultTypes,
        warningResultTypeMismatches,
        postgresContractIssues,
      });
    }
  }

  if (checked.length === 0) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_QUERY_BOUNDARIES_NOT_FOUND',
      'No feature query boundaries were discovered for contract drift check.',
      'Run feature scaffold/query scaffold first, or pass a feature positional value or --query for an existing feature query boundary.',
      { rootDir },
    );
  }

  return {
    rootDir,
    checked,
    ok: checked.every((entry) =>
      entry.missingInMapper.length === 0
      && entry.unusedInMapper.length === 0
      && entry.mismatchedParameterTypes.length === 0
      && entry.parameterTypeConflicts.length === 0
      && entry.missingResultInMapper.length === 0
      && entry.unusedResultInMapper.length === 0
      && entry.mismatchedResultTypes.length === 0
      && entry.postgresContractIssues.length === 0
    ),
  };
}

function buildFeatureFiles(
  rootDir: string,
  featureName: string,
  queryName: string,
  action: FeatureAction,
  table: DdlTable,
  primaryKeyColumn: string,
  returningMode: InsertReturningMode = 'all',
  optimisticLockConfig?: OptimisticLockScaffoldConfig,
  featureRoot = 'src/features',
): GeneratedFile[] {
  const boundary = `${featureRoot}/${featureName}`;
  const actionPlan = buildActionPlan(action, table, primaryKeyColumn, returningMode, optimisticLockConfig);
  return [
    ...buildSharedFiles(featureRoot),
    { relativePath: boundary, kind: 'directory' },
    { relativePath: `${boundary}/queries/${queryName}`, kind: 'directory' },
    { relativePath: `${boundary}/tests`, kind: 'directory' },
    {
      relativePath: `${boundary}/README.md`,
      kind: 'file',
      contents: renderFeatureReadme(featureName, queryName, action, table, primaryKeyColumn),
    },
    {
      relativePath: `${boundary}/boundary.ts`,
      kind: 'file',
      contents: renderFeatureBoundary(featureName),
    },
    {
      relativePath: `${boundary}/input.ts`,
      kind: 'file',
      contents: renderFeatureInput(featureName, actionPlan),
    },
    {
      relativePath: `${boundary}/workflow.ts`,
      kind: 'file',
      contents: renderFeatureWorkflow(featureName, queryName, actionPlan),
    },
    {
      relativePath: `${boundary}/output.ts`,
      kind: 'file',
      contents: renderFeatureOutput(featureName, queryName, actionPlan),
    },
    {
      relativePath: `${boundary}/tests/${featureName}.boundary.test.ts`,
      kind: 'file',
      contents: renderFeatureBoundaryTest(featureName, queryName, actionPlan),
    },
    ...buildQueryFiles(rootDir, boundary, queryName, action, table, primaryKeyColumn, returningMode, optimisticLockConfig),
  ];
}

function discoverFeatureBoundaries(rootDir: string, featureName?: string, boundaryDir?: string, featureRoot = 'src/features'): Array<{ name: string; dir: string }> {
  const featuresDir = path.join(rootDir, featureRoot);
  if (featureName && boundaryDir) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_BOUNDARY_INPUT_CONFLICT',
      'Use either a feature name or --boundary-dir, not both.',
      'Choose one boundary selector and rerun the command.',
      { options: ['<feature>', '--boundary-dir'] },
    );
  }
  if (boundaryDir) {
    const dir = path.resolve(rootDir, boundaryDir);
    return [{ name: path.basename(dir), dir }];
  }
  if (featureName) {
    const name = normalizeFeatureName(featureName);
    return [{ name, dir: path.join(featuresDir, name) }];
  }
  if (!existsSync(featuresDir)) {
    throw invalidCliInputError(
      'ASHIBA_FEATURES_DIR_MISSING',
      `No ${featureRoot} directory was discovered.`,
      'Run ashiba feature scaffold first, or pass a feature positional value for an existing feature directory.',
      { featuresDir: toProjectPath(rootDir, featuresDir) },
    );
  }
  return readdirSync(featuresDir)
    .filter((entry) => !entry.startsWith('_'))
    .filter((entry) => statSync(path.join(featuresDir, entry)).isDirectory())
    .sort()
    .map((name) => ({ name, dir: path.join(featuresDir, name) }));
}

function discoverQueryNames(queriesDir: string, queryName?: string): string[] {
  if (queryName) {
    return [normalizeQueryName(queryName)];
  }
  return readdirSync(queriesDir)
    .filter((entry) => statSync(path.join(queriesDir, entry)).isDirectory())
    .sort();
}

function resolveQueryTestMetadata(
  rootDir: string,
  featureName: string,
  queryName: string,
  queryDir: string,
): ResolvedQueryTestMetadata | undefined {
  const inferred = inferQueryTestMetadataFromSql(rootDir, featureName, queryName, queryDir);
  return inferred ? { metadata: inferred, inferred: true } : undefined;
}

function buildMetadataBackedResultTypeOverrides(rootDir: string, metadata: QueryTestMetadata): Record<string, string> | undefined {
  if (metadata.importSource === 'existing-sql' || !metadata.action || !metadata.table || !metadata.primaryKeyColumn) {
    return undefined;
  }
  const table = loadDdlTable(rootDir, metadata.table);
  const actionPlan = buildActionPlan(metadata.action, table, metadata.primaryKeyColumn, metadata.returningMode ?? 'all', configFromOptimisticLockMetadata(metadata.optimisticLock));
  return Object.fromEntries(actionPlan.rows.map((column) => [column.name, toTsType(column)]));
}

function shouldPreferMetadataBackedResultType(metadataType: string, contractType: string): boolean {
  const metadataBase = stripNullableType(metadataType);
  const contractBase = stripNullableType(contractType);
  return metadataBase === 'string' && contractBase === 'number';
}

function inferQueryTestMetadataFromSql(
  rootDir: string,
  featureName: string,
  queryName: string,
  queryDir: string,
): QueryTestMetadata | undefined {
  const sqlPath = path.join(queryDir, `${queryName}.sql`);
  if (!existsSync(sqlPath)) return undefined;
  const sql = normalizeSqlSource(readFileSync(sqlPath, 'utf8'));
  let statement: ReturnType<typeof SqlParser.parse>;
  try {
    statement = parseFeatureQuerySql(sql);
  } catch {
    return {
      feature: featureName,
      query: queryName,
      action: inferFeatureActionFromName(queryName),
      physicalTables: [],
      importSource: 'existing-sql',
    };
  }
  const action = inferFeatureAction(statement, queryName);
  const imported = inferImportedQueryTestMetadata(rootDir, featureName, queryName, sql);
  const tableName = extractRootTableName(statement);
  if (!tableName) {
    return {
      feature: featureName,
      query: queryName,
      action,
      ...(imported.anchorSource ? { anchorSource: imported.anchorSource } : {}),
      ...(imported.anchorTable ? { anchorTable: imported.anchorTable.canonicalName } : {}),
      ...(imported.anchorTable ? { table: imported.anchorTable.canonicalName } : {}),
      ...(imported.primaryKeyColumn ? { primaryKeyColumn: imported.primaryKeyColumn } : {}),
      physicalTables: imported.physicalTables.map((table) => table.canonicalName),
      importSource: 'existing-sql',
    };
  }
  const table = loadOptionalDdlTable(rootDir, tableName);
  if (!table) {
    return {
      feature: featureName,
      query: queryName,
      action,
      ...(imported.anchorSource ? { anchorSource: imported.anchorSource } : {}),
      ...(imported.anchorTable ? { anchorTable: imported.anchorTable.canonicalName } : {}),
      ...(imported.anchorTable ? { table: imported.anchorTable.canonicalName } : {}),
      ...(imported.primaryKeyColumn ? { primaryKeyColumn: imported.primaryKeyColumn } : {}),
      physicalTables: imported.physicalTables.map((physicalTable) => physicalTable.canonicalName),
      importSource: 'existing-sql',
    };
  }
  const primaryKeyColumn = resolvePrimaryKeyColumn(table);
  return {
    feature: featureName,
    query: queryName,
    action,
    table: table.canonicalName,
    anchorSource: imported.anchorSource ?? table.name,
    anchorTable: table.canonicalName,
    physicalTables: imported.physicalTables.map((physicalTable) => physicalTable.canonicalName),
    primaryKeyColumn,
  };
}

function parseFeatureQuerySql(sql: string): ReturnType<typeof SqlParser.parse> {
  try {
    return SqlParser.parse(sql);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw astParseUserError({
      code: 'ASHIBA_FEATURE_QUERY_AST_PARSE_FAILED',
      message: 'Query AST parse failed while inferring SQL logic-test metadata.',
      reason,
      sqlKind: 'SQL',
      operation: 'inferring feature SQL logic-test metadata',
    });
  }
}

function extractRootTableName(statement: ReturnType<typeof SqlParser.parse>): string | undefined {
  const source = statement instanceof SimpleSelectQuery
    ? statement.fromClause?.source
    : statement instanceof InsertQuery
      ? statement.insertClause.source
      : statement instanceof UpdateQuery
        ? statement.updateClause.source
        : statement instanceof DeleteQuery
          ? statement.deleteClause.source
          : undefined;
  if (!(source?.datasource instanceof TableSource)) return undefined;
  const qualifiedName = source.datasource.qualifiedName;
  if (!qualifiedName) return undefined;
  const schema = readIdentifierText(qualifiedName.namespaces?.at(-1));
  const table = normalizeIdentifier(readIdentifierText(qualifiedName.name) ?? '');
  return schema ? `${normalizeIdentifier(schema)}.${table}` : table;
}

interface AnchorSource {
  name: string;
  tableName?: string;
}

function resolveAnchorSource(statement: ReturnType<typeof SqlParser.parse>): AnchorSource | undefined {
  return resolveAnchorSourceFromStatement(statement, new Set(), []);
}

function resolveAnchorSourceFromStatement(
  statement: ReturnType<typeof SqlParser.parse> | SelectQuery,
  seenCtes: Set<string>,
  outerCtes: CommonTable[],
): AnchorSource | undefined {
  if (statement instanceof SimpleSelectQuery) {
    return resolveAnchorSourceFromSelect(statement, seenCtes, outerCtes);
  }
  if (statement instanceof BinarySelectQuery) {
    return undefined;
  }
  if (statement instanceof InsertQuery) {
    return anchorFromSource(statement.insertClause.source);
  }
  if (statement instanceof UpdateQuery) {
    return anchorFromSource(statement.updateClause.source);
  }
  if (statement instanceof DeleteQuery) {
    return anchorFromSource(statement.deleteClause.source);
  }
  return undefined;
}

function resolveAnchorSourceFromSelect(query: SimpleSelectQuery, seenCtes: Set<string>, outerCtes: CommonTable[]): AnchorSource | undefined {
  const source = query.fromClause?.source;
  const anchor = anchorFromSource(source);
  if (!anchor) return undefined;
  const visibleCtes = [...(query.withClause?.tables ?? []), ...outerCtes];
  const cte = findCteByName(visibleCtes, anchor.name);
  if (!cte) return anchor;
  const key = anchor.name.toLowerCase();
  if (seenCtes.has(key)) return { name: anchor.name };
  const nextSeen = new Set(seenCtes);
  nextSeen.add(key);
  const resolved = resolveAnchorSourceFromStatement(cte.query, nextSeen, visibleCtes);
  return {
    name: anchor.name,
    ...(resolved?.tableName ? { tableName: resolved.tableName } : {}),
  };
}

function findCteByName(ctes: CommonTable[] | null | undefined, name: string): CommonTable | undefined {
  return (ctes ?? []).find((cte) => normalizeIdentifier(cte.getSourceAliasName()).toLowerCase() === normalizeIdentifier(name).toLowerCase());
}

function anchorFromSource(source: SourceExpression | null | undefined): AnchorSource | undefined {
  if (!source || !(source.datasource instanceof TableSource)) return undefined;
  const name = normalizeIdentifier(source.datasource.table.name);
  const tableName = source.datasource.qualifiedName.toString();
  return {
    name,
    ...(tableName ? { tableName } : {}),
  };
}

function resolveAnchorDdlTable(
  anchor: AnchorSource,
  tableMap: Map<string, DdlTable>,
  pathConfig: ReturnType<typeof loadProjectPathConfig>,
): DdlTable | undefined {
  return anchor.tableName ? resolveSchemaPathTable({ tables: tableMap }, anchor.tableName, pathConfig) : undefined;
}

function collectPhysicalDdlTables(
  statement: ReturnType<typeof SqlParser.parse>,
  tableMap: Map<string, DdlTable>,
  pathConfig: ReturnType<typeof loadProjectPathConfig>,
): DdlTable[] {
  const found = new Map<string, DdlTable>();
  for (const reference of collectTableReferences(statement)) {
    const rawName = reference.schema ? `${reference.schema}.${reference.table}` : reference.table;
    const table = resolveSchemaPathTable({ tables: tableMap }, rawName, pathConfig);
    if (table) {
      found.set(table.canonicalName.toLowerCase(), table);
    }
  }
  return Array.from(found.values()).sort((left, right) => left.canonicalName.localeCompare(right.canonicalName));
}

function readIdentifierText(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  if ('name' in value && typeof value.name === 'string') return value.name;
  if ('value' in value && typeof value.value === 'string') return value.value;
  return undefined;
}

function inferFeatureAction(statement: ReturnType<typeof SqlParser.parse>, queryName: string): FeatureAction {
  if (statement instanceof InsertQuery) return 'insert';
  if (statement instanceof UpdateQuery) return 'update';
  if (statement instanceof DeleteQuery) return 'delete';
  if (statement instanceof SimpleSelectQuery) {
    if (queryName === 'get-by-id' || queryName.startsWith('get-')) return 'get-by-id';
    return 'list';
  }
  throw invalidCliInputError(
    'ASHIBA_FEATURE_QUERY_ACTION_UNSUPPORTED',
    'SQL logic-test metadata inference supports SELECT/INSERT/UPDATE/DELETE query boundaries only.',
    'Keep each logic test tied to one query boundary, or refresh the query metadata explicitly.',
    { queryName, statementType: statement.constructor.name },
  );
}

function inferFeatureActionFromName(queryName: string): FeatureAction {
  if (/^(?:insert|create|add)(?:-|$)/.test(queryName)) return 'insert';
  if (/^(?:update|set|change)(?:-|$)/.test(queryName)) return 'update';
  if (/^(?:delete|remove)(?:-|$)/.test(queryName)) return 'delete';
  if (/^(?:get|find)(?:-|$)/.test(queryName)) return 'get-by-id';
  return 'list';
}

function extractMapperParameters(source: string, queryName: string): string[] {
  const pascal = toPascal(queryName);
  const preferred = extractInterfaceFields(source, `${pascal}QueryParams`);
  if (preferred.length > 0 || source.includes(`interface ${pascal}QueryParams`)) {
    return preferred;
  }

  const matches = [...source.matchAll(/export\s+interface\s+([A-Za-z0-9_]+QueryParams)\s*\{([\s\S]*?)\}/g)];
  if (matches.length === 1) {
    return extractFieldNames(matches[0][2] ?? '');
  }
  return [];
}

function extractMapperParameterTypes(source: string, queryName: string): Record<string, string> {
  const pascal = toPascal(queryName);
  const preferred = extractInterfaceFieldTypes(source, `${pascal}QueryParams`);
  if (Object.keys(preferred).length > 0 || source.includes(`interface ${pascal}QueryParams`)) {
    return preferred;
  }

  const matches = [...source.matchAll(/export\s+interface\s+([A-Za-z0-9_]+QueryParams)\s*\{([\s\S]*?)\}/g)];
  if (matches.length === 1) {
    return extractFieldTypes(matches[0][2] ?? '');
  }
  return {};
}

function extractMapperResultColumns(source: string, queryName: string): string[] {
  const pascal = toPascal(queryName);
  const preferred = extractInterfaceFields(source, `${pascal}QueryResult`);
  if (preferred.length > 0 || source.includes(`interface ${pascal}QueryResult`)) {
    return preferred;
  }

  const matches = [...source.matchAll(/export\s+interface\s+([A-Za-z0-9_]+QueryResult)\s*\{([\s\S]*?)\}/g)];
  if (matches.length === 1) {
    return extractFieldNames(matches[0][2] ?? '');
  }
  return [];
}

function extractMapperResultTypes(source: string, queryName: string): Record<string, string> {
  const pascal = toPascal(queryName);
  const preferred = extractInterfaceFieldTypes(source, `${pascal}QueryResult`);
  if (Object.keys(preferred).length > 0 || source.includes(`interface ${pascal}QueryResult`)) {
    return preferred;
  }

  const matches = [...source.matchAll(/export\s+interface\s+([A-Za-z0-9_]+QueryResult)\s*\{([\s\S]*?)\}/g)];
  if (matches.length === 1) {
    return extractFieldTypes(matches[0][2] ?? '');
  }
  return {};
}

function areResultTypesCompatible(mapperType: string, expectedSqlType: string): boolean {
  const mapper = normalizeTypeScriptTypeForComparison(mapperType);
  const expected = normalizeTypeScriptTypeForComparison(expectedSqlType);
  if (mapper === 'unknown') return false;
  if (mapper === expected) return true;
  const mapperBase = stripNullableType(mapper);
  const expectedBase = stripNullableType(expected);
  if (mapperBase !== expectedBase) return false;
  return !isNullableType(expected) && isNullableType(mapper);
}

function isParameterTypeCoveredByDriverContract(mapperType: string, expectedType: string): boolean {
  const mapperMembers = splitTopLevelTypeUnion(normalizeTypeScriptTypeForComparison(mapperType));
  const expectedMembers = new Set(splitTopLevelTypeUnion(normalizeTypeScriptTypeForComparison(expectedType)));
  return mapperMembers.length > 0 && mapperMembers.every((member) => expectedMembers.has(member));
}

function splitTopLevelTypeUnion(type: string): string[] {
  const members: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < type.length; index += 1) {
    const character = type[index];
    if (character === '(' || character === '<' || character === '[' || character === '{') depth += 1;
    if (character === ')' || character === '>' || character === ']' || character === '}') depth = Math.max(0, depth - 1);
    if (character === '|' && depth === 0) {
      members.push(type.slice(start, index).trim());
      start = index + 1;
    }
  }
  members.push(type.slice(start).trim());
  return members.filter((member) => member.length > 0);
}

interface ResultTypeDrift {
  severity: 'error' | 'warning';
  message: string;
}

function classifyResultTypeDrift(options: {
  column: string;
  mapperType: string;
  expectedSqlType: string;
  nullability: ResultNullabilityLevel;
}): ResultTypeDrift | undefined {
  const mapper = normalizeTypeScriptTypeForComparison(options.mapperType);
  const expected = normalizeTypeScriptTypeForComparison(options.expectedSqlType);
  if (mapper === expected) return undefined;
  if (mapper === 'unknown') {
    return {
      severity: 'error',
      message: `${options.column}: mapper ${options.mapperType} / SQL ${options.expectedSqlType}`,
    };
  }

  const mapperBase = stripNullableType(mapper);
  const expectedBase = stripNullableType(expected);
  if (mapperBase !== expectedBase) {
    return {
      severity: 'error',
      message: `${options.column}: mapper ${options.mapperType} / SQL ${options.expectedSqlType}`,
    };
  }

  if (!isNullableType(expected) && isNullableType(mapper)) {
    return {
      severity: 'error',
      message: `${options.column}: mapper ${options.mapperType} / SQL ${options.expectedSqlType}`,
    };
  }

  if (isNullableType(expected) && !isNullableType(mapper) && options.nullability === 'unknown') {
    return {
      severity: 'warning',
      message: `${options.column}: mapper ${options.mapperType} / SQL ${options.expectedSqlType} (nullability unknown; customer-owned DTO is narrower than Ashiba's conservative import contract)`,
    };
  }

  if (!areResultTypesCompatible(mapper, expected)) {
    return {
      severity: 'error',
      message: `${options.column}: mapper ${options.mapperType} / SQL ${options.expectedSqlType}`,
    };
  }
  return undefined;
}

function normalizeTypeScriptTypeForComparison(type: string): string {
  return type.replace(/\s+/g, ' ').trim();
}

function stripNullableType(type: string): string {
  return normalizeTypeScriptTypeForComparison(type).replace(/\s*\|\s*null/g, '');
}

function extractInterfaceFields(source: string, interfaceName: string): string[] {
  const escapedName = interfaceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`export\\s+interface\\s+${escapedName}\\s*\\{([\\s\\S]*?)\\}`));
  return match ? extractFieldNames(match[1] ?? '') : [];
}

function extractInterfaceFieldTypes(source: string, interfaceName: string): Record<string, string> {
  const escapedName = interfaceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`export\\s+interface\\s+${escapedName}\\s*\\{([\\s\\S]*?)\\}`));
  return match ? extractFieldTypes(match[1] ?? '') : {};
}

function extractFieldNames(body: string): string[] {
  return body
    .split(/\r?\n/)
    .map((line) => line.replace(/\/\/.*$/, '').trim())
    .map((line) => line.match(/^([A-Za-z_][A-Za-z0-9_]*)\??\s*:/)?.[1])
    .filter((field): field is string => Boolean(field))
    .sort();
}

function extractFieldTypes(body: string): Record<string, string> {
  return Object.fromEntries(body
    .split(/\r?\n/)
    .map((line) => line.replace(/\/\/.*$/, '').trim())
    .map((line) => line.match(/^([A-Za-z_][A-Za-z0-9_]*)\??\s*:\s*([^;]+);?$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => [match[1] ?? '', (match[2] ?? '').trim()])
    .filter(([field]) => field.length > 0)
    .sort(([left], [right]) => left.localeCompare(right)));
}

function formatGeneratedMapperCheck(result: FeatureGeneratedMapperCheckResult): string {
  const lines = [`Feature contract check: ${result.ok ? 'ok' : 'failed'}`];
  for (const entry of result.checked) {
    lines.push('', `- ${entry.feature}/${entry.query}`);
    lines.push(`  sql: ${entry.sqlFile}`);
    lines.push(`  boundary: ${entry.queryFile}`);
    lines.push(`  sql parameters: ${entry.sqlParameters.length > 0 ? entry.sqlParameters.join(', ') : '(none)'}`);
    lines.push(`  boundary parameters: ${entry.mapperParameters.length > 0 ? entry.mapperParameters.join(', ') : '(none)'}`);
    if (Object.keys(entry.sqlParameterTypes).length > 0) {
      lines.push(`  sql parameter types: ${formatTypeMap(entry.sqlParameterTypes)}`);
    }
    if (Object.keys(entry.mapperParameterTypes).length > 0) {
      lines.push(`  boundary parameter types: ${formatTypeMap(entry.mapperParameterTypes)}`);
    }
    lines.push(`  sql result columns: ${entry.sqlResultColumns.length > 0 ? entry.sqlResultColumns.join(', ') : '(none)'}`);
    lines.push(`  boundary result columns: ${entry.mapperResultColumns.length > 0 ? entry.mapperResultColumns.join(', ') : '(none)'}`);
    if (Object.keys(entry.sqlResultTypes).length > 0) {
      lines.push(`  sql result types: ${formatTypeMap(entry.sqlResultTypes)}`);
    }
    if (Object.keys(entry.mapperResultTypes).length > 0) {
      lines.push(`  boundary result types: ${formatTypeMap(entry.mapperResultTypes)}`);
    }
    if (entry.missingInMapper.length > 0) {
      lines.push(`  missing in boundary: ${entry.missingInMapper.join(', ')}`);
    }
    if (entry.unusedInMapper.length > 0) {
      lines.push(`  unused in boundary: ${entry.unusedInMapper.join(', ')}`);
    }
    if (entry.mismatchedParameterTypes.length > 0) {
      lines.push(`  mismatched parameter types: ${entry.mismatchedParameterTypes.join(', ')}`);
    }
    if (entry.warningParameterTypeMismatches.length > 0) {
      lines.push(`  warning parameter type mismatches: ${entry.warningParameterTypeMismatches.join(', ')}`);
    }
    if (entry.parameterTypeConflicts.length > 0) {
      lines.push(`  parameter type conflicts: ${entry.parameterTypeConflicts.join(', ')}`);
    }
    if (entry.warningParameterTypeConflicts.length > 0) {
      lines.push(`  warning parameter type conflicts: ${entry.warningParameterTypeConflicts.join(', ')}`);
    }
    if (entry.missingResultInMapper.length > 0) {
      lines.push(`  missing result in boundary: ${entry.missingResultInMapper.join(', ')}`);
    }
    if (entry.unusedResultInMapper.length > 0) {
      lines.push(`  unused result in boundary: ${entry.unusedResultInMapper.join(', ')}`);
    }
    if (entry.mismatchedResultTypes.length > 0) {
      lines.push(`  mismatched result types: ${entry.mismatchedResultTypes.join(', ')}`);
    }
    if (entry.warningResultTypeMismatches.length > 0) {
      lines.push(`  warning result type mismatches: ${entry.warningResultTypeMismatches.join(', ')}`);
    }
    if (entry.postgresContractIssues.length > 0) {
      lines.push(`  PostgreSQL contract issues: ${entry.postgresContractIssues.join(', ')}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

function formatTypeMap(types: Record<string, string>): string {
  return Object.entries(types).map(([name, type]) => `${name}: ${type}`).join(', ');
}

function formatFeatureTestsCheck(result: FeatureTestsCheckResult): string {
  const lines = [
    `Feature tests check ${result.ok ? 'passed' : 'failed'}`,
    `- root: ${result.rootDir}`,
    `- fix: ${result.fixed ? 'applied' : 'off'}`,
  ];
  for (const entry of result.checked) {
    lines.push('', `- ${entry.ok ? 'ok' : 'issue'}: ${entry.feature}/${entry.query}`);
    for (const issue of entry.issues) lines.push(`  issue: ${issue}`);
    for (const fixed of entry.fixed) lines.push(`  fixed: ${fixed}`);
  }
  return `${lines.join('\n')}\n`;
}

function buildQueryFiles(
  rootDir: string,
  boundary: string,
  queryName: string,
  action: FeatureAction,
  table: DdlTable,
  primaryKeyColumn: string,
  returningMode: InsertReturningMode = 'all',
  optimisticLockConfig?: OptimisticLockScaffoldConfig
): GeneratedFile[] {
  const queryDir = `${boundary}/queries/${queryName}`;
  const actionPlan = buildActionPlan(action, table, primaryKeyColumn, returningMode, optimisticLockConfig);
  const sql = renderActionSql(actionPlan, table, primaryKeyColumn, rootDir);
  return [
    ...buildSharedFiles(),
    { relativePath: queryDir, kind: 'directory' },
    {
      relativePath: `${queryDir}/${queryName}.sql`,
      kind: 'file',
      contents: sql,
    },
    {
      relativePath: `${queryDir}/query.ts`,
      kind: 'file',
      contents: renderQueryBoundary(rootDir, queryName, actionPlan, table, primaryKeyColumn),
    },
    { relativePath: `${queryDir}/generated`, kind: 'directory' },
    {
      relativePath: `${queryDir}/generated/query.meta.ts`,
      kind: 'file',
      contents: renderQueryMetadata(buildFeatureQueryModel(sql, rootDir)),
      overwrite: true,
    },
    {
      relativePath: `${queryDir}/generated/query.sql.ts`,
      kind: 'file',
      contents: renderQuerySqlSource(sql),
      overwrite: true,
    },
  ];
}

function buildImportedFeatureFiles(
  relativeFeatureDir: string,
  featureName: string,
  queryName: string,
  parameters: string[],
  parameterTypes: Record<string, string>,
  resultColumnContracts: SqlResultColumnContract[],
): GeneratedFile[] {
  return [
    { relativePath: relativeFeatureDir, kind: 'directory' },
    {
      relativePath: `${relativeFeatureDir}/README.md`,
      kind: 'file',
      contents: renderImportedFeatureReadme(featureName, queryName),
      overwrite: false,
    },
    {
      relativePath: `${relativeFeatureDir}/boundary.ts`,
      kind: 'file',
      contents: renderFeatureBoundary(featureName),
      overwrite: false,
    },
    {
      relativePath: `${relativeFeatureDir}/input.ts`,
      kind: 'file',
      contents: renderImportedFeatureInput(featureName, queryName, parameters, parameterTypes),
      overwrite: false,
    },
    {
      relativePath: `${relativeFeatureDir}/workflow.ts`,
      kind: 'file',
      contents: renderImportedFeatureWorkflow(featureName, queryName),
      overwrite: false,
    },
    {
      relativePath: `${relativeFeatureDir}/output.ts`,
      kind: 'file',
      contents: renderImportedFeatureOutput(featureName, queryName, resultColumnContracts),
      overwrite: false,
    },
    {
      relativePath: `${relativeFeatureDir}/tests`,
      kind: 'directory',
    },
    {
      relativePath: `${relativeFeatureDir}/tests/${featureName}.boundary.test.ts`,
      kind: 'file',
      contents: renderImportedFeatureBoundaryTest(featureName, queryName, parameters, parameterTypes, resultColumnContracts),
      overwrite: false,
    },
  ];
}

function buildExpectedLogicTestSupportFiles(
  rootDir: string,
  relativeFeatureDir: string,
  featureName: string,
  queryName: string,
  queryDir: string,
): GeneratedFile[] {
  const sqlPath = path.join(queryDir, `${queryName}.sql`);
  if (!existsSync(sqlPath)) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_QUERY_SQL_MISSING',
      `Visible SQL is required before scaffolding logic tests: ${toProjectPath(rootDir, sqlPath)}.`,
      'Restore the canonical SQL file or remove the stale query boundary before scaffolding tests.',
      { featureName, queryName },
    );
  }
  const sql = normalizeSqlSource(readFileSync(sqlPath, 'utf8'));
  const inferred = inferImportedQueryTestMetadata(rootDir, featureName, queryName, sql);
  const resultColumnContracts = buildQueryResultColumnContracts(sql, rootDir);
  const fields = toContractFields(
    resultColumnContracts,
    inferImportedResultNullabilityByColumn(resultColumnContracts, inferred.anchorTable),
  );
  const queryRoot = `${relativeFeatureDir}/queries/${queryName}`;
  return [
    {
      relativePath: `${queryRoot}/tests/${queryName}.boundary.ztd.test.ts`,
      kind: 'file',
      contents: renderQueryZtdTest(featureName, queryName),
      overwrite: true,
    },
    {
      relativePath: `${queryRoot}/tests/boundary-ztd-types.ts`,
      kind: 'file',
      contents: renderImportedQueryZtdTypes(queryName, inferred.physicalTables, fields),
      overwrite: true,
    },
  ];
}

interface ImportedQueryTestMetadata {
  feature: string;
  query: string;
  action: FeatureAction;
  anchorSource?: string;
  anchorTable?: DdlTable;
  primaryKeyColumn?: string;
  physicalTables: DdlTable[];
}

function inferImportedQueryTestMetadata(
  rootDir: string,
  featureName: string,
  queryName: string,
  sql: string,
): ImportedQueryTestMetadata {
  let statement: ReturnType<typeof SqlParser.parse>;
  try {
    statement = parseFeatureQuerySql(sql);
  } catch {
    return {
      feature: featureName,
      query: queryName,
      action: inferFeatureActionFromName(queryName),
      physicalTables: [],
    };
  }
  const tables = loadOptionalDdlTables(rootDir);
  const pathConfig = loadProjectPathConfig(rootDir);
  const tableMap = new Map(tables.map((table) => [table.canonicalName.toLowerCase(), table]));
  const physicalTables = collectPhysicalDdlTables(statement, tableMap, pathConfig);
  const anchor = resolveAnchorSource(statement);
  const anchorTable = anchor ? resolveAnchorDdlTable(anchor, tableMap, pathConfig) : undefined;
  const primaryKeyColumn = anchorTable ? resolvePrimaryKeyColumn(anchorTable) : undefined;
  const action = inferFeatureAction(statement, queryName);
  return {
    feature: featureName,
    query: queryName,
    action,
    ...(anchor?.name ? { anchorSource: anchor.name } : {}),
    ...(anchorTable ? { anchorTable } : {}),
    ...(primaryKeyColumn ? { primaryKeyColumn } : {}),
    physicalTables,
  };
}

function buildSharedFiles(featureRoot = 'src/features'): GeneratedFile[] {
  return [
    { relativePath: `${featureRoot}/_shared`, kind: 'directory' },
    {
      relativePath: `${featureRoot}/_shared/featureQueryExecutor.ts`,
      kind: 'file',
      overwrite: false,
      contents: [
        'export {',
        '  FeatureQueryCardinalityError,',
        '  queryMany,',
        '  queryOne,',
        '  queryOneOrNull,',
        '  type FeatureQueryExecutor,',
        '  type FeatureQueryModel,',
        '  type FeatureQuerySource,',
        "} from '@ashiba-ts/driver-adapter-core';",
        '',
      ].join('\n'),
    },
  ];
}

function writeGeneratedFiles(
  rootDir: string,
  files: GeneratedFile[],
  dryRun: boolean,
  force: boolean
): FeatureScaffoldResult['outputs'] {
  const outputs: FeatureScaffoldResult['outputs'] = [];
  const seen = new Set<string>();

  for (const file of files) {
    if (seen.has(file.relativePath)) {
      continue;
    }
    seen.add(file.relativePath);
    const destination = path.join(rootDir, file.relativePath);
    const exists = existsSync(destination);
    const mayOverwrite = force || file.overwrite === true;
    let actuallyWritten = false;
    if (file.kind === 'file' && exists && !mayOverwrite && file.overwrite !== false) {
      throw invalidCliInputError(
        'ASHIBA_SCAFFOLD_OVERWRITE_REQUIRES_FORCE',
        `Refusing to overwrite scaffold-owned file without --force: ${file.relativePath}`,
        'Review the existing file and rerun with --force only when overwriting scaffold-owned output is intentional.',
        { file: file.relativePath },
      );
    }
    if (!dryRun) {
      if (file.kind === 'directory') {
        mkdirSync(destination, { recursive: true });
        actuallyWritten = true;
      } else if (!exists || mayOverwrite || file.overwrite !== false) {
        mkdirSync(path.dirname(destination), { recursive: true });
        writeFileSync(destination, file.contents ?? '', 'utf8');
        actuallyWritten = true;
      }
    }
    outputs.push({ path: file.relativePath, written: actuallyWritten, kind: file.kind });
  }

  return outputs;
}

function getFeatureQueryBoundaryDependencyWarnings(rootDir: string): string[] {
  const packageJsonPath = path.join(rootDir, 'package.json');
  if (!existsSync(packageJsonPath)) return [];

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
    dependencies?: Record<string, unknown>;
    devDependencies?: Record<string, unknown>;
  };
  const dependencies = packageJson.dependencies ?? {};
  const devDependencies = packageJson.devDependencies ?? {};
  if (DRIVER_ADAPTER_CORE_PACKAGE in dependencies || DRIVER_ADAPTER_CORE_PACKAGE in devDependencies) {
    return [];
  }

  return [DRIVER_ADAPTER_CORE_MIGRATION_WARNING];
}

function loadDdlTable(rootDir: string, rawTableName: string): DdlTable {
  const pathConfig = loadProjectPathConfig(rootDir);
  const ddlDir = resolveDdlDir(rootDir);
  const files = collectSqlFiles(ddlDir);
  const tables = files.flatMap((file) => parseDdlTables(readFileSync(file, 'utf8'), pathConfig.defaultSchema));
  const tableMap = new Map(tables.map((table) => [table.canonicalName.toLowerCase(), table]));
  const resolved = resolveSchemaPathTable({ tables: tableMap }, rawTableName, pathConfig);
  if (!resolved) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_TABLE_NOT_FOUND',
      `Table not found for scaffold: ${rawTableName}.`,
      'Check --table, the configured DDL directory, and ashiba.config.json searchPath, then rerun the scaffold command.',
      { table: rawTableName, searchPath: formatSearchPath(pathConfig) },
    );
  }
  return resolved;
}

function resolveDdlDir(rootDir: string): string {
  const configPath = path.join(rootDir, 'ashiba.config.json');
  if (existsSync(configPath)) {
    try {
      const parsed = JSON.parse(readFileSync(configPath, 'utf8')) as { ddl?: { sourceDir?: unknown }; ddlDir?: unknown };
      if (typeof parsed.ddl?.sourceDir === 'string') {
        return path.resolve(rootDir, parsed.ddl.sourceDir);
      }
      if (typeof parsed.ddlDir === 'string') {
        return path.resolve(rootDir, parsed.ddlDir);
      }
    } catch (error) {
      throw invalidCliInputError(
        'ASHIBA_CONFIG_JSON_PARSE_FAILED',
        'Failed to parse ashiba.config.json.',
        'Fix ashiba.config.json so it is valid JSON, or remove it to use the default db/ddl directory.',
        { configPath, reason: error instanceof Error ? error.message : String(error) },
      );
    }
  }
  return path.join(rootDir, 'db', 'ddl');
}

function collectSqlFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    throw invalidCliInputError(
      'ASHIBA_DDL_DIRECTORY_NOT_FOUND',
      `DDL directory does not exist: ${dir}.`,
      'Create the configured DDL directory, pass the correct root/config, or update ashiba.config.json ddl.sourceDir.',
      { dir },
    );
  }
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      found.push(...collectSqlFiles(fullPath));
    } else if (stat.isFile() && entry.toLowerCase().endsWith('.sql')) {
      found.push(fullPath);
    }
  }
  return found.sort();
}

function parseDdlTables(sql: string, defaultSchema = 'public'): DdlTable[] {
  return MultiQuerySplitter.split(sql).getNonEmpty().flatMap((statement) => {
    try {
      const parsed = SqlParser.parse(statement.sql);
      return parsed instanceof CreateTableQuery ? [createDdlTable(parsed, defaultSchema)] : [];
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw astParseUserError({
        code: 'ASHIBA_FEATURE_DDL_AST_PARSE_FAILED',
        message: 'DDL AST parse failed while reading feature scaffold table metadata.',
        reason,
        sqlKind: 'DDL',
        operation: 'reading feature scaffold table metadata',
      });
    }
  });
}

function createDdlTable(parsed: CreateTableQuery, defaultSchema = 'public'): DdlTable {
  const schema = normalizeIdentifier(parsed.namespaces?.[0] ?? defaultSchema);
  const name = normalizeIdentifier(parsed.tableName.name);
  const tablePrimaryKeys = parsed.tableConstraints
    .filter((constraint) => constraint.kind === 'primary-key')
    .flatMap((constraint) => constraint.columns ?? [])
    .map((value) => normalizeIdentifier(value.name));
  const tablePrimaryKeySet = new Set(tablePrimaryKeys.map((value) => value.toLowerCase()));
  const columns: DdlColumn[] = [];
  for (const column of parsed.columns) {
    const columnName = normalizeIdentifier(column.name.name);
    const primaryKey = tablePrimaryKeySet.has(columnName.toLowerCase())
      || column.constraints.some((constraint) => constraint.kind === 'primary-key');
    const generated = column.constraints.some((constraint) =>
      constraint.kind === 'generated-always-identity' || constraint.kind === 'generated-by-default-identity'
    );
    const defaultValue = column.constraints.find((constraint) => constraint.kind === 'default')?.defaultValue;
    columns.push({
      name: columnName,
      typeName: getColumnTypeName(column.dataType),
      nullable: !primaryKey && !column.constraints.some((constraint) => constraint.kind === 'not-null'),
      defaultValue: defaultValue ? formatValue(defaultValue) : undefined,
      generated,
      primaryKey,
    });
  }
  const primaryKeyColumns = [...new Set([...columns.filter((column) => column.primaryKey).map((column) => column.name), ...tablePrimaryKeys])];
  return { schema, name, canonicalName: `${schema}.${name}`, columns, primaryKeyColumns };
}

function getColumnTypeName(dataType: CreateTableQuery['columns'][number]['dataType']): string {
  if (dataType instanceof TypeValue) return dataType.getTypeName();
  if (dataType instanceof RawString) return dataType.value.trim();
  return 'unknown';
}

function formatValue(value: ValueComponent): string {
  const formatted = defaultSqlFormatter.format(value).formattedSql;
  return formatted.match(/^"([A-Za-z_][A-Za-z0-9_$]*)"$/)?.[1] ?? formatted;
}

function buildActionPlan(
  action: FeatureAction,
  table: DdlTable,
  primaryKeyColumn: string,
  returningMode: InsertReturningMode = 'all',
  optimisticLockConfig: OptimisticLockScaffoldConfig = { versionColumn: 'version_key', scaffold: 'off' },
): {
  action: FeatureAction;
  params: DdlColumn[];
  rows: DdlColumn[];
  writeColumns: DdlColumn[];
  returningMode: InsertReturningMode;
  optimisticLock?: OptimisticLockPlan;
} {
  const primaryKey = requireColumn(table, primaryKeyColumn);
  if (action === 'insert') {
    const writeColumns = table.columns.filter((column) => !isGeneratedInsertColumn(column, primaryKeyColumn) && column.defaultValue == null);
    const rows = returningMode === 'minimal' ? [primaryKey] : table.columns;
    return { action, params: writeColumns, rows, writeColumns, returningMode };
  }
  if (action === 'update') {
    const optimisticLockColumn = resolveOptimisticLockColumn(table, optimisticLockConfig, primaryKeyColumn);
    const writeColumns = table.columns.filter((column) =>
      column.name !== primaryKeyColumn &&
      column.name !== optimisticLockColumn?.name &&
      !isGeneratedInsertColumn(column, primaryKeyColumn),
    );
    if (writeColumns.length === 0) {
      throw invalidCliInputError(
        'ASHIBA_FEATURE_UPDATE_REQUIRES_MUTABLE_COLUMN',
        `Update scaffold requires at least one mutable non-primary-key column: ${table.canonicalName}.`,
        'Add a mutable non-primary-key column to the DDL table or choose a different scaffold action.',
        { table: table.canonicalName },
      );
    }
    if (optimisticLockColumn) {
      const optimisticLock = {
        versionColumn: optimisticLockColumn.name,
        expectedVersionParameter: `expected_${optimisticLockColumn.name}`,
      };
      return {
        action,
        params: [primaryKey, toExpectedVersionParameter(optimisticLockColumn, optimisticLock.expectedVersionParameter), ...writeColumns],
        rows: table.columns,
        writeColumns,
        returningMode: 'all',
        optimisticLock,
      };
    }
    return { action, params: [primaryKey, ...writeColumns], rows: table.columns, writeColumns, returningMode: 'all' };
  }
  if (action === 'delete') {
    return { action, params: [primaryKey], rows: table.columns, writeColumns: [], returningMode: 'all' };
  }
  if (action === 'get-by-id') {
    return { action, params: [primaryKey], rows: table.columns, writeColumns: [], returningMode: 'all' };
  }
  const limitColumn: DdlColumn = {
    name: 'limit',
    typeName: 'integer',
    nullable: false,
    generated: false,
    primaryKey: false,
  };
  return { action, params: [limitColumn], rows: table.columns, writeColumns: [], returningMode: 'all' };
}

function resolveOptimisticLockColumn(
  table: DdlTable,
  config: OptimisticLockScaffoldConfig,
  primaryKeyColumn: string,
): DdlColumn | undefined {
  if (config.scaffold === 'off') return undefined;
  if (!config.versionColumn || config.versionColumn === primaryKeyColumn) return undefined;
  return table.columns.find((column) => column.name === config.versionColumn);
}

function toExpectedVersionParameter(column: DdlColumn, name: string): DdlColumn {
  return {
    ...column,
    name,
    nullable: false,
    generated: false,
    primaryKey: false,
    defaultValue: undefined,
  };
}

function configFromOptimisticLockMetadata(metadata: OptimisticLockPlan | undefined): OptimisticLockScaffoldConfig {
  return metadata
    ? { versionColumn: metadata.versionColumn, scaffold: 'when-column-exists' }
    : { versionColumn: 'version_key', scaffold: 'off' };
}

function renderActionSql(plan: ReturnType<typeof buildActionPlan>, table: DdlTable, primaryKeyColumn: string, rootDir: string): string {
  const tableName = quoteQualifiedName(table.canonicalName);
  const pk = quoteIdentifier(primaryKeyColumn);
  let sql: string;
  if (plan.action === 'insert') {
    const returningColumns = plan.rows.map((column) => quoteIdentifier(column.name)).join(', ');
    if (plan.writeColumns.length === 0) {
      return formatGeneratedSql(`insert into ${tableName}\ndefault values\nreturning ${returningColumns};\n`, rootDir);
    }
    sql = [
      `insert into ${tableName} (`,
      plan.writeColumns.map((column) => `  ${quoteIdentifier(column.name)}`).join(',\n'),
      ') values (',
      plan.writeColumns.map((column) => `  :${column.name}`).join(',\n'),
      `) returning ${returningColumns};`,
      '',
    ].join('\n');
    return formatGeneratedSql(sql, rootDir);
  }
  if (plan.action === 'update') {
    const returningColumns = plan.rows.map((column) => quoteIdentifier(column.name)).join(', ');
    const setLines = [
      ...plan.writeColumns.map((column) => `  ${quoteIdentifier(column.name)} = :${column.name}`),
      ...(plan.optimisticLock
        ? [`  ${quoteIdentifier(plan.optimisticLock.versionColumn)} = ${quoteIdentifier(plan.optimisticLock.versionColumn)} + 1`]
        : []),
    ];
    const whereLines = [
      `  ${pk} = :${primaryKeyColumn}`,
      ...(plan.optimisticLock
        ? [`  ${quoteIdentifier(plan.optimisticLock.versionColumn)} = :${plan.optimisticLock.expectedVersionParameter}`]
        : []),
    ];
    sql = [
      `update ${tableName}`,
      'set',
      setLines.join(',\n'),
      'where',
      whereLines.join('\nand\n'),
      `returning ${returningColumns};`,
      '',
    ].join('\n');
    return formatGeneratedSql(sql, rootDir);
  }
  if (plan.action === 'delete') {
    const returningColumns = plan.rows.map((column) => quoteIdentifier(column.name)).join(', ');
    return formatGeneratedSql([`delete from ${tableName}`, 'where', `  ${pk} = :${primaryKeyColumn}`, `returning ${returningColumns};`, ''].join('\n'), rootDir);
  }
  if (plan.action === 'get-by-id') {
    sql = [
      'select',
      table.columns.map((column) => `  ${quoteIdentifier(column.name)}`).join(',\n'),
      `from ${tableName}`,
      'where',
      `  ${pk} = :${primaryKeyColumn};`,
      '',
    ].join('\n');
    return formatGeneratedSql(sql, rootDir);
  }
  sql = [
    'select',
    table.columns.map((column) => `  ${quoteIdentifier(column.name)}`).join(',\n'),
    `from ${tableName}`,
    'order by',
    `  ${pk} asc`,
    'limit :limit;',
    '',
  ].join('\n');
  return formatGeneratedSql(sql, rootDir);
}

function formatGeneratedSql(sql: string, rootDir: string): string {
  const sqlFormatter = new SqlFormatter(resolveGeneratedSqlFormatOptions(rootDir, sql));
  const formattedSql = sqlFormatter.format(SqlParser.parse(sql)).formattedSql.trimEnd();
  return `${formattedSql};\n`;
}

function renderFeatureBoundary(featureName: string): string {
  const pascal = toPascal(featureName);
  return [
    `import type { FeatureQueryExecutor } from '${FEATURE_SHARED_EXECUTOR_IMPORT_PATH}';`,
    "import { parseRequest, type " + pascal + "Request } from './input.js';",
    "import { buildResult, type " + pascal + "Response } from './output.js';",
    "import { executeWorkflow } from './workflow.js';",
    '',
    '/**',
    ` * Executes the ${featureName} feature boundary.`,
    ' *',
    ' * Review order:',
    ' * 1. parse and normalize caller input',
    ' * 2. run feature workflow with query-boundary dependencies',
    ' * 3. shape the response for the caller boundary',
    ' */',
    'export async function execute(',
    '  executor: FeatureQueryExecutor,',
    '  rawRequest: unknown,',
    `): Promise<${pascal}Response> {`,
    '  const request = parseRequest(rawRequest);',
    '  const result = await executeWorkflow(executor, request);',
    '  return buildResult(result);',
    '}',
    '',
  ].join('\n');
}

function renderFeatureInput(featureName: string, plan: ReturnType<typeof buildActionPlan>): string {
  const pascal = toPascal(featureName);
  const fields = toFeatureFields(plan.params);
  return [
    `export interface ${pascal}Request ${renderRenderFieldInterfaceBody(fields)}`,
    '',
    '/** Parses, normalizes, and rejects invalid caller input at the feature boundary. */',
    `export function parseRequest(raw: unknown): ${pascal}Request {`,
    `  const request = parseRawRequest(raw);`,
    '  const normalized = normalizeRequest(request);',
    '  rejectRequest(normalized);',
    '  return normalized;',
    '}',
    '',
    `function parseRawRequest(raw: unknown): ${pascal}Request {`,
    '  const record = readRecord(raw);',
    ...(fields.length > 0
      ? [
          '  return {',
          ...fields.map((field) => `    ${field.name}: ${renderReadFieldExpression(field)},`),
          '  };',
        ]
      : ['  return {};']),
    '}',
    '',
    `function normalizeRequest(request: ${pascal}Request): ${pascal}Request {`,
    ...(fields.length > 0
      ? [
          '  return {',
          ...fields.map((field) => field.parserKind === 'string'
            ? `    ${field.name}: ${field.nullable ? `request.${field.name} === null ? null : request.${field.name}.trim()` : `request.${field.name}.trim()`},`
            : `    ${field.name}: request.${field.name},`),
          '  };',
        ]
      : ['  return request;']),
    '}',
    '',
    `function rejectRequest(request: ${pascal}Request): void {`,
    ...renderRejectRequestLines(pascal, fields),
    '}',
    '',
    ...renderFeatureParserSupport(),
    '',
  ].join('\n');
}

function renderFeatureWorkflow(featureName: string, queryName: string, plan: ReturnType<typeof buildActionPlan>): string {
  const pascal = toPascal(featureName);
  const queryPascal = toPascal(queryName);
  const fields = toFeatureFields(plan.params);
  const requestName = fields.length > 0 ? 'request' : '_request';
  const resultType = renderFeatureQueryResultType(plan.action, queryPascal);
  return [
    `import type { FeatureQueryExecutor } from '${FEATURE_SHARED_EXECUTOR_IMPORT_PATH}';`,
    `import type { ${pascal}Request } from './input.js';`,
    `import { execute${queryPascal}Query, type ${queryPascal}QueryParams, type ${queryPascal}QueryResult } from './queries/${queryName}/query.js';`,
    '',
    `export type ${pascal}WorkflowResult = ${resultType};`,
    '',
    `export interface ${pascal}Queries {`,
    `  execute${queryPascal}: (`,
    '    executor: FeatureQueryExecutor,',
    `    params: ${queryPascal}QueryParams,`,
    `  ) => Promise<${resultType}>;`,
    '}',
    '',
    `const defaultQueries: ${pascal}Queries = {`,
    `  execute${queryPascal}: execute${queryPascal}Query,`,
    '};',
    '',
    '/** Runs feature orchestration after input parsing. Query functions are injectable for DB-free feature tests. */',
    'export async function executeWorkflow(',
    '  executor: FeatureQueryExecutor,',
    `  request: ${pascal}Request,`,
    `  queries: ${pascal}Queries = defaultQueries,`,
    `): Promise<${pascal}WorkflowResult> {`,
    `  return queries.execute${queryPascal}(executor, toQueryParams(request));`,
    '}',
    '',
    `function toQueryParams(${requestName}: ${pascal}Request): ${queryPascal}QueryParams {`,
    ...(fields.length > 0
      ? [
          '  return {',
          ...fields.map((field) => `    ${field.sourceName}: ${requestName}.${field.name},`),
          '  };',
        ]
      : ['  return {};']),
    '}',
    '',
  ].join('\n');
}

function renderFeatureOutput(featureName: string, queryName: string, plan: ReturnType<typeof buildActionPlan>): string {
  const pascal = toPascal(featureName);
  const queryPascal = toPascal(queryName);
  const fields = toFeatureFields(plan.rows);
  const resultType = renderFeatureQueryResultType(plan.action, queryPascal);
  return [
    `import type { ${queryPascal}QueryResult } from './queries/${queryName}/query.js';`,
    '',
    ...renderFeatureResponseType(pascal, plan.action, fields),
    '',
    `export function buildResult(result: ${resultType}): ${pascal}Response {`,
    ...renderFeatureBuildResultLines(plan.action, fields),
    '}',
    '',
  ].join('\n');
}

function renderFeatureQueryResultType(action: FeatureAction, queryPascal: string): string {
  if (isManyResultAction(action)) return `${queryPascal}QueryResult[]`;
  if (action === 'get-by-id') return `${queryPascal}QueryResult | null`;
  return `${queryPascal}QueryResult`;
}

function isManyResultAction(action: FeatureAction): boolean {
  return action === 'list' || action === 'update' || action === 'delete';
}

function toFeatureFields(columns: DdlColumn[]): RenderField[] {
  return columns.map((column) => {
    const typeScriptType = toTsType(column);
    const baseType = typeScriptType.replace(' | null', '');
    return {
      name: toCamel(column.name),
      sourceName: column.name,
      typeScriptType,
      parserKind: baseType === 'number' ? 'number' : baseType === 'boolean' ? 'boolean' : 'string',
      nullable: column.nullable,
    };
  });
}

function renderRenderFieldInterfaceBody(fields: RenderField[]): string {
  if (fields.length === 0) return '{ [key: string]: never; }';
  return `{\n${fields.map((field) => `  ${field.name}: ${field.typeScriptType};`).join('\n')}\n}`;
}

function renderReadFieldExpression(field: RenderField): string {
  const functionName = field.parserKind === 'number'
    ? 'readNumber'
    : field.parserKind === 'boolean'
      ? 'readBoolean'
      : 'readString';
  return `${functionName}(record[${JSON.stringify(field.name)}], ${JSON.stringify(`${field.name}`)}, ${field.nullable})`;
}

function renderRejectRequestLines(pascal: string, fields: RenderField[]): string[] {
  const lines = fields
    .filter((field) => field.parserKind === 'string')
    .flatMap((field) => {
      if (field.nullable) {
        return [
          `  if (request.${field.name} !== null && request.${field.name}.length === 0) {`,
          `    throw new Error('${pascal}Request.${field.name} must not be empty after trim().');`,
          '  }',
        ];
      }
      return [
        `  if (request.${field.name}.length === 0) {`,
        `    throw new Error('${pascal}Request.${field.name} must not be empty after trim().');`,
        '  }',
      ];
    });
  return lines.length > 0 ? lines : ['  // Add feature-level reject rules here when follow-up requirements appear.'];
}

function renderFeatureParserSupport(): string[] {
  return [
    'function readRecord(raw: unknown): Record<string, unknown> {',
    "  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {",
    "    throw new Error('Feature request must be an object.');",
    '  }',
    '  return raw as Record<string, unknown>;',
    '}',
    '',
    'function readString(value: unknown, label: string, nullable: true): string | null;',
    'function readString(value: unknown, label: string, nullable?: false): string;',
    'function readString(value: unknown, label: string, nullable = false): string | null {',
    '  if (value === null && nullable) return null;',
    "  if (typeof value !== 'string') throw new Error(`${label} must be a string.`);",
    '  return value;',
    '}',
    '',
    'function readNumber(value: unknown, label: string, nullable: true): number | null;',
    'function readNumber(value: unknown, label: string, nullable?: false): number;',
    'function readNumber(value: unknown, label: string, nullable = false): number | null {',
    '  if (value === null && nullable) return null;',
    "  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label} must be a finite number.`);",
    '  return value;',
    '}',
    '',
    'function readBoolean(value: unknown, label: string, nullable: true): boolean | null;',
    'function readBoolean(value: unknown, label: string, nullable?: false): boolean;',
    'function readBoolean(value: unknown, label: string, nullable = false): boolean | null {',
    '  if (value === null && nullable) return null;',
    "  if (typeof value !== 'boolean') throw new Error(`${label} must be a boolean.`);",
    '  return value;',
    '}',
  ];
}

function renderFeatureResponseType(pascal: string, action: FeatureAction, fields: RenderField[]): string[] {
  if (isManyResultAction(action)) {
    return [
      `export interface ${pascal}Response {`,
      '  items: Array<{',
      ...fields.map((field) => `    ${field.name}: ${field.typeScriptType};`),
      '  }>;',
      '}',
    ];
  }
  if (action === 'get-by-id') {
    return [
      `export type ${pascal}Response = {`,
      ...fields.map((field) => `  ${field.name}: ${field.typeScriptType};`),
      '} | null;',
    ];
  }
  return [
    `export interface ${pascal}Response ${renderRenderFieldInterfaceBody(fields)}`,
  ];
}

function renderFeatureBuildResultLines(action: FeatureAction, fields: RenderField[]): string[] {
  if (isManyResultAction(action)) {
    return [
      '  return {',
      '    items: result.map((item) => ({',
      ...fields.map((field) => `      ${field.name}: item.${field.sourceName},`),
      '    })),',
      '  };',
    ];
  }
  if (action === 'get-by-id') {
    return [
      '  if (result === null) return null;',
      ...(fields.length === 0
        ? ['  return {};']
        : [
            '  return {',
            ...fields.map((field) => `    ${field.name}: result.${field.sourceName},`),
            '  };',
          ]),
    ];
  }
  if (fields.length === 0) return ['  return {};'];
  return [
    '  return {',
    ...fields.map((field) => `    ${field.name}: result.${field.sourceName},`),
    '  };',
  ];
}

function sampleFieldValue(field: RenderField): unknown {
  if (field.nullable) return field.parserKind === 'string' ? `${field.name}-value` : field.parserKind === 'number' ? 1 : true;
  if (field.parserKind === 'number') return 1;
  if (field.parserKind === 'boolean') return true;
  return `${field.name}-value`;
}

function renderQueryBoundary(
  _rootDir: string,
  queryName: string,
  plan: ReturnType<typeof buildActionPlan>,
  table: DdlTable,
  primaryKeyColumn: string,
): string {
  const pascal = toPascal(queryName);
  const camel = toCamel(queryName);
  const result = isManyResultAction(plan.action)
    ? `${pascal}QueryResult[]`
    : plan.action === 'get-by-id'
      ? `${pascal}QueryResult | null`
      : `${pascal}QueryResult`;
  const enablesOptionalConditionCompression = plan.action === 'list' || plan.action === 'get-by-id';
  const helperName = isManyResultAction(plan.action)
    ? 'queryMany'
    : plan.action === 'get-by-id'
      ? 'queryOneOrNull'
      : 'queryOne';
  return [
    `import { ${helperName}, type FeatureQuerySource } from '@ashiba-ts/driver-adapter-core';`,
    `import type { FeatureQueryExecutor } from '${FEATURE_SHARED_EXECUTOR_IMPORT_PATH}';`,
    "import { queryModel } from './generated/query.meta.js';",
    "import { querySql } from './generated/query.sql.js';",
    '',
    `export const ${camel}Sql = querySql;`,
    `export const ${camel}Query: FeatureQuerySource<${pascal}QueryParams, ${pascal}QueryResult> = {`,
    `  id: '${queryName}',`,
    `  path: '${queryName}.sql',`,
    `  sqlPath: '${queryName}.sql',`,
    `  sql: ${camel}Sql,`,
    '  queryModel,',
    ...(enablesOptionalConditionCompression ? ['  optionalConditionCompression: true,'] : []),
    '  metadata: {',
    `    sqlId: '${queryName}',`,
    `    queryId: '${queryName}',`,
    `    sqlFile: '${queryName}.sql',`,
    `    sqlPath: '${queryName}.sql',`,
    '  },',
    '};',
    '',
    `export interface ${pascal}QueryParams ${renderInterfaceBody(plan.params)}`,
    '',
    `export interface ${pascal}QueryResult ${renderInterfaceBody(plan.rows)}`,
    '',
    `export async function execute${pascal}Query(`,
    '  executor: FeatureQueryExecutor,',
    `  params: ${pascal}QueryParams`,
    `): Promise<${result}> {`,
    `  return ${helperName}(executor, ${camel}Query, params);`,
    '}',
    '',
  ].join('\n');
}

function renderImportedQueryBoundary(
  queryName: string,
  parameters: string[],
  parameterTypes: Record<string, string>,
  resultColumnContracts: SqlResultColumnContract[],
  enablesOptionalConditionCompression: boolean,
  contractDegraded = false,
): string {
  const pascal = toPascal(queryName);
  const camel = toCamel(queryName);
  const resultFields = toContractFields(resultColumnContracts, inferImportedResultNullabilityByColumn(resultColumnContracts));
  return [
    "import { queryMany, type FeatureQuerySource } from '@ashiba-ts/driver-adapter-core';",
    `import type { FeatureQueryExecutor } from '${FEATURE_SHARED_EXECUTOR_IMPORT_PATH}';`,
    "import { queryModel } from './generated/query.meta.js';",
    "import { querySql } from './generated/query.sql.js';",
    '',
    `export const ${camel}Sql = querySql;`,
    `export const ${camel}Query: FeatureQuerySource<${pascal}QueryParams, ${pascal}QueryResult> = {`,
    `  id: '${queryName}',`,
    `  path: '${queryName}.sql',`,
    `  sqlPath: '${queryName}.sql',`,
    `  sql: ${camel}Sql,`,
    '  queryModel,',
    ...(enablesOptionalConditionCompression ? ['  optionalConditionCompression: true,'] : []),
    '  metadata: {',
    `    sqlId: '${queryName}',`,
    `    queryId: '${queryName}',`,
    `    sqlFile: '${queryName}.sql',`,
    `    sqlPath: '${queryName}.sql',`,
    '  },',
    '};',
    '',
    `export interface ${pascal}QueryParams ${renderImportedParamsInterface(parameters, parameterTypes)}`,
    '',
    `export interface ${pascal}QueryResult ${contractDegraded ? '{ [column: string]: unknown; }' : renderContractFieldInterfaceBody(resultFields)}`,
    '',
    `export async function execute${pascal}Query(`,
    '  executor: FeatureQueryExecutor,',
    `  params: ${pascal}QueryParams`,
    `): Promise<${pascal}QueryResult[]> {`,
    `  return queryMany(executor, ${camel}Query, params);`,
    '}',
    '',
  ].join('\n');
}

function renderQueryMetadata(queryModel: ReturnType<typeof buildFeatureQueryModel>): string {
  return [
    '// Generated by Ashiba. Do not edit by hand.',
    '// Refresh with `ashiba feature query refresh` after SQL-only edits.',
    `export const queryModel = ${JSON.stringify(queryModel, null, 2)} as const;`,
    '',
  ].join('\n');
}

function renderQuerySqlSource(sql: string): string {
  return [
    '// Generated by Ashiba. Do not edit by hand.',
    '// Refresh with `ashiba feature query refresh` after SQL-only edits.',
    `export const querySql = ${JSON.stringify(normalizeSqlSource(sql))} as const;`,
    '',
  ].join('\n');
}

function renderImportedFeatureReadme(featureName: string, queryName: string): string {
  return [
    `# ${featureName}`,
    '',
    `Imported query: ${queryName}`,
    '',
    'This feature was scaffolded from an existing visible SQL file.',
    'Generated code is editable after import. Keep SQL visible, named, and directly runnable in a SQL client.',
    'Static and PostgreSQL-derived contract checks prove DB-to-TypeScript result contracts without persisted synthetic probes.',
    'Add Human/AI-owned SQL logic cases under the query-local `tests/cases/` directory only when query behavior merits executable examples.',
    'For mutation queries, use route or integration tests for TypeScript-to-DB inputs, affected rows, persisted state, transaction behavior, defaults, constraints, triggers, and read-after-write behavior.',
    '',
  ].join('\n');
}

function renderImportedFeatureInput(
  featureName: string,
  queryName: string,
  parameters: string[],
  parameterTypes: Record<string, string>,
): string {
  const pascal = toPascal(featureName);
  const queryPascal = toPascal(queryName);
  const readerNames = new Set<string>();
  const parameterLines = parameters.map((parameter) => {
    const typeScriptType = parameterTypes[parameter] ?? 'unknown';
    const readerName = importedInputReaderName(typeScriptType);
    if (readerName) readerNames.add(readerName);
    const value = readerName
      ? `${readerName}(record[${JSON.stringify(parameter)}], ${JSON.stringify(parameter)})`
      : `record[${JSON.stringify(parameter)}]`;
    return `    ${renderPropertyKey(parameter)}: ${value},`;
  });
  return [
    `import type { ${queryPascal}QueryParams } from './queries/${queryName}/query.js';`,
    '',
    `export type ${pascal}Request = ${queryPascal}QueryParams;`,
    '',
    '/**',
    ' * Imported-SQL features keep request parsing intentionally thin.',
    ' * Add domain validation here after deciding the application boundary contract.',
    ' */',
    `export function parseRequest(raw: unknown): ${pascal}Request {`,
    '  if (!isRecord(raw)) {',
    "    throw new Error('Feature request must be an object.');",
    '  }',
    '  const record = raw;',
    ...(parameters.length > 0
      ? [
          '  return {',
          ...parameterLines,
          '  };',
        ]
      : ['  return {};']),
    '}',
    '',
    'function isRecord(value: unknown): value is Record<string, unknown> {',
    "  return typeof value === 'object' && value !== null && !Array.isArray(value);",
    '}',
    ...[...readerNames].sort().flatMap((readerName) => ['', ...renderImportedInputReader(readerName)]),
    '',
  ].join('\n');
}

function importedInputReaderName(typeScriptType: string): string | undefined {
  const nullable = /\|\s*null\b/.test(typeScriptType);
  const base = typeScriptType.replace(/\s*\|\s*null/g, '').trim();
  const suffix = base === 'string'
    ? 'String'
    : base === 'number'
      ? 'Number'
      : base === 'boolean'
        ? 'Boolean'
        : base === 'string[]'
          ? 'StringArray'
          : base === 'number[]'
            ? 'NumberArray'
            : base === 'boolean[]'
              ? 'BooleanArray'
              : undefined;
  return suffix ? `read${nullable ? 'Nullable' : ''}${suffix}` : undefined;
}

function renderImportedInputReader(readerName: string): string[] {
  const nullable = readerName.startsWith('readNullable');
  const kind = readerName.replace(/^read(?:Nullable)?/, '');
  const typeScriptType = kind === 'String'
    ? 'string'
    : kind === 'Number'
      ? 'number'
      : kind === 'Boolean'
        ? 'boolean'
        : kind === 'StringArray'
          ? 'string[]'
          : kind === 'NumberArray'
            ? 'number[]'
            : 'boolean[]';
  const scalar = kind === 'String' || kind === 'Number' || kind === 'Boolean';
  const scalarType = kind.toLowerCase();
  const guard = scalar
    ? `typeof value === '${scalarType}'`
    : `Array.isArray(value) && value.every((entry): entry is ${typeScriptType.slice(0, -2)} => typeof entry === '${kind.replace('Array', '').toLowerCase()}')`;
  return [
    `function ${readerName}(value: unknown, name: string): ${typeScriptType}${nullable ? ' | null' : ''} {`,
    ...(nullable ? ['  if (value === null) return null;'] : []),
    `  if (${guard}) return value;`,
    `  throw new Error(\`Feature request parameter \${name} must be ${nullable ? 'null or ' : ''}${typeScriptType}.\`);`,
    '}',
  ];
}

function renderImportedFeatureWorkflow(featureName: string, queryName: string): string {
  const pascal = toPascal(featureName);
  const queryPascal = toPascal(queryName);
  return [
    `import type { FeatureQueryExecutor } from '${FEATURE_SHARED_EXECUTOR_IMPORT_PATH}';`,
    `import type { ${pascal}Request } from './input.js';`,
    `import { execute${queryPascal}Query, type ${queryPascal}QueryParams, type ${queryPascal}QueryResult } from './queries/${queryName}/query.js';`,
    '',
    `export type ${pascal}WorkflowResult = ${queryPascal}QueryResult[];`,
    '',
    `export interface ${pascal}Queries {`,
    `  execute${queryPascal}: (`,
    '    executor: FeatureQueryExecutor,',
    `    params: ${queryPascal}QueryParams,`,
    `  ) => Promise<${queryPascal}QueryResult[]>;`,
    '}',
    '',
    `const defaultQueries: ${pascal}Queries = {`,
    `  execute${queryPascal}: execute${queryPascal}Query,`,
    '};',
    '',
    '/** Runs feature orchestration after input parsing. Query functions are injectable for DB-free feature tests. */',
    'export async function executeWorkflow(',
    '  executor: FeatureQueryExecutor,',
    `  request: ${pascal}Request,`,
    `  queries: ${pascal}Queries = defaultQueries,`,
    `): Promise<${pascal}WorkflowResult> {`,
    `  return queries.execute${queryPascal}(executor, request);`,
    '}',
    '',
  ].join('\n');
}

function renderImportedFeatureOutput(
  featureName: string,
  queryName: string,
  resultColumnContracts: SqlResultColumnContract[],
): string {
  const pascal = toPascal(featureName);
  const queryPascal = toPascal(queryName);
  const fields = toContractFields(resultColumnContracts, inferImportedResultNullabilityByColumn(resultColumnContracts));
  return [
    `import type { ${queryPascal}QueryResult } from './queries/${queryName}/query.js';`,
    '',
    `export interface ${pascal}Response {`,
    '  items: Array<{',
    ...fields.map((field) => `    ${renderPropertyKey(field.name)}: ${field.typeScriptType};`),
    '  }>;',
    '}',
    '',
    `export function buildResult(result: ${queryPascal}QueryResult[]): ${pascal}Response {`,
    '  return {',
    '    items: result.map((item) => ({',
    ...fields.map((field) => `      ${renderPropertyKey(field.name)}: item[${JSON.stringify(field.name)}],`),
    '    })),',
    '  };',
    '}',
    '',
  ].join('\n');
}

function renderImportedFeatureBoundaryTest(
  featureName: string,
  queryName: string,
  parameters: string[],
  parameterTypes: Record<string, string>,
  resultColumnContracts: SqlResultColumnContract[],
): string {
  const pascal = toPascal(featureName);
  const queryPascal = toPascal(queryName);
  const queryCamel = toCamel(queryName);
  const request = Object.fromEntries(parameters.map((parameter) => [parameter, sampleValueForType(parameterTypes[parameter] ?? 'unknown')]));
  const fields = toContractFields(resultColumnContracts, inferImportedResultNullabilityByColumn(resultColumnContracts));
  const response = {
    items: [
      Object.fromEntries(fields.map((field) => [field.name, sampleValueForType(field.typeScriptType)])),
    ],
  };
  return [
    "import { expect, test } from 'vitest';",
    '',
    "import { execute } from '../boundary.js';",
    `import type { FeatureQueryExecutor } from '${FEATURE_SHARED_EXECUTOR_IMPORT_PATH}';`,
    `import { ${queryCamel}Query, type ${queryPascal}QueryResult } from '../queries/${queryName}/query.js';`,
    '',
    `test('${featureName} executes imported ${queryName} query boundary through injected workflow', async () => {`,
    `  const request = ${renderTsExpression(request, 2)};`,
    `  const row: ${queryPascal}QueryResult = ${renderTsExpression(response.items[0], 2)};`,
    `  const executor: FeatureQueryExecutor<typeof ${queryCamel}Query> = {`,
    '    async query() {',
    '      return [row];',
    '    },',
    '  };',
    '',
    `  await expect(execute(executor, request)).resolves.toEqual(${renderTsExpression(response, 2)});`,
    '});',
    '',
    `// ${pascal} starts from imported SQL. Add boundary-level behavior cases as requirements grow.`,
    '',
  ].join('\n');
}

export function buildFeatureQueryModel(
  sql: string,
  rootDir: string,
  postgresContract?: PostgresDerivedQueryContract,
): {
  analysis: ReturnType<typeof analyzeQueryModel>;
  bindings: {
    postgres: QueryModelBindings['postgres'];
  };
} {
  const sourceHash = hashSql(sql);
  const postgres = compileNamedParameters(sql, { placeholderStyle: 'postgres' });
  const resultColumnContracts = buildQueryResultColumnContracts(sql, rootDir);
  const parameters = [...new Set(postgres.orderedNames)];
  const ddlModel = loadDdlSchemaModel(rootDir);
  const schemaPath = loadProjectPathConfig(rootDir);
  const analysis = analyzeQueryModel(sql, parameters, resultColumnContracts, {
    optionalConditionCompression: true,
    parameterTypes: inferSqlParameterTypes(sql, ddlModel, schemaPath).parameterTypes,
  });
  return {
    analysis,
    bindings: {
      postgres: {
        sourceHash,
        ...postgres,
        ...(postgresContract ? { contract: postgresContract } : {}),
        ...buildPostgresSafeSortBindingMetadata(sql, analysis.safeSort),
        ...buildPostgresOptionalConditionCompressionBindingMetadata(sql, analysis.optionalConditionCompression),
      },
    },
  };
}

function renderInterfaceBody(columns: DdlColumn[]): string {
  if (columns.length === 0) {
    return '{ [key: string]: never; }';
  }
  return `{\n${columns.map((column) => `  ${column.name}: ${toTsType(column)};`).join('\n')}\n}`;
}

function renderImportedParamsInterface(parameters: string[], parameterTypes: Record<string, string>): string {
  if (parameters.length === 0) {
    return '{ [key: string]: never; }';
  }
  return `{\n${parameters.map((parameter) => `  ${renderPropertyKey(parameter)}: ${parameterTypes[parameter] ?? 'unknown'};`).join('\n')}\n}`;
}

function renderContractFieldInterfaceBody(fields: RenderContractField[]): string {
  if (fields.length === 0) {
    return '{ [key: string]: never; }';
  }
  return `{\n${fields.map((field) => `  ${renderPropertyKey(field.name)}: ${field.typeScriptType};`).join('\n')}\n}`;
}

function toContractFields(
  columns: SqlResultColumnContract[],
  nullabilityByColumn: Record<string, ResultNullabilityLevel> = {},
): RenderContractField[] {
  return columns.map((column) => {
    const nullability = column.nullability !== 'unknown'
      ? column.nullability
      : nullabilityByColumn[column.name] ?? 'unknown';
    const typeScriptType = nullability === 'non-null'
      ? column.type
      : makeConservativeNullableType(column.type);
    return {
      name: column.name,
      typeScriptType,
      sqlType: sqlTypeForContract(inferSqlTypeForResultColumn(column) ?? sqlTypeForTypeScript(typeScriptType)),
      nullability,
    };
  });
}

function inferImportedResultNullabilityByColumn(
  columns: SqlResultColumnContract[],
  table?: DdlTable,
): Record<string, ResultNullabilityLevel> {
  return Object.fromEntries(columns.map((column) => [column.name, inferImportedResultNullability(column, table)]));
}

function inferImportedResultNullability(column: SqlResultColumnContract, table?: DdlTable): ResultNullabilityLevel {
  if (column.nullability !== 'unknown') return column.nullability;
  const expression = normalizeSqlExpressionForNullability(column.expression ?? '');
  const ddlColumn = table?.columns.find((candidate) => candidate.name.toLowerCase() === column.name.toLowerCase());
  if (ddlColumn?.nullable) return 'nullable';
  if (isNullableType(column.type)) return 'nullable';
  if (!expression) return 'unknown';
  if (/\bnull\b/i.test(expression)) return 'nullable';
  if (isObviousNonNullExpression(expression)) return 'non-null';
  return 'unknown';
}

function loadOptionalDdlTable(rootDir: string, tableName: string): DdlTable | undefined {
  try {
    return loadDdlTable(rootDir, tableName);
  } catch {
    return undefined;
  }
}

function loadOptionalDdlTables(rootDir: string): DdlTable[] {
  try {
    const pathConfig = loadProjectPathConfig(rootDir);
    return collectSqlFiles(resolveDdlDir(rootDir))
      .flatMap((file) => parseDdlTables(readFileSync(file, 'utf8'), pathConfig.defaultSchema));
  } catch {
    return [];
  }
}

function normalizeSqlExpressionForNullability(expression: string): string {
  return expression.replace(/\s+/g, ' ').trim();
}

function isObviousNonNullExpression(expression: string): boolean {
  const normalized = expression.toLowerCase();
  if (/^(true|false)$/.test(normalized)) return true;
  if (/^[-+]?\d+(?:\.\d+)?$/.test(normalized)) return true;
  if (/^'(?:''|[^'])*'$/.test(expression)) return true;
  const cast = normalized.match(/^cast\((.*) as [^)]+\)$/);
  if (!cast) return false;
  return isObviousNonNullExpression((cast[1] ?? '').trim());
}

function makeConservativeNullableType(typeScriptType: string): string {
  const normalized = typeScriptType.trim();
  if (normalized === 'unknown' || normalized.includes('null')) return normalized;
  return `${normalized} | null`;
}

function hashSql(sql: string): string {
  return `sha256:${createHash('sha256').update(normalizeSqlSource(sql)).digest('hex')}`;
}

function formatImportedSqlSafely(sql: string, rootDir: string): { sql: string; formatted: boolean; reason?: string } {
  const formatter = new SqlFormatter(resolveGeneratedSqlFormatOptions(rootDir, sql));
  let formattedSql: string;
  try {
    formattedSql = `${formatter.format(SqlParser.parse(sql)).formattedSql.trimEnd()};\n`;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      sql: normalizeSqlText(sql),
      formatted: false,
      reason: `formatting skipped because SQL AST analysis degraded: ${reason}`,
    };
  }
  const safety = validateImportedFormattedSql(sql, formattedSql, formatter);
  if (!safety.safe) {
    return { sql: normalizeSqlText(sql), formatted: false, reason: safety.reason };
  }
  return { sql: formattedSql, formatted: normalizeLineEndings(sql) !== normalizeLineEndings(formattedSql) };
}

function validateImportedFormattedSql(
  originalSql: string,
  formattedSql: string,
  formatter: SqlFormatter,
): ({ safe: true; reason?: undefined } | { safe: false; reason: string }) {
  const beforeTokens = LexemeCursor.getAllLexemesWithPosition(originalSql);
  const afterTokens = LexemeCursor.getAllLexemesWithPosition(formattedSql);
  const tokenSummary = formatImportedTokenSummary(beforeTokens, afterTokens);
  const missingComments = missingImportedSqlCommentFragments(originalSql, formattedSql);
  if (missingComments.length > 0) {
    return { safe: false, reason: `formatting skipped because SQL comments would be dropped: ${missingComments.join(', ')}` };
  }
  const originalParameters = compileNamedParameters(originalSql).orderedNames;
  const formattedParameters = compileNamedParameters(formattedSql).orderedNames;
  if (JSON.stringify(originalParameters) !== JSON.stringify(formattedParameters)) {
    return {
      safe: false,
      reason: [
        'formatting skipped because SQL named parameters changed',
        `before=${formatImportedParameterList(originalParameters)}`,
        `after=${formatImportedParameterList(formattedParameters)}`,
        tokenSummary,
      ].join('; '),
    };
  }
  try {
    const originalNormalized = formatter.format(SqlParser.parse(originalSql)).formattedSql.trim();
    const formattedNormalized = formatter.format(SqlParser.parse(formattedSql)).formattedSql.trim();
    if (originalNormalized !== formattedNormalized) {
      return {
        safe: false,
        reason: `formatting skipped because formatted SQL did not round-trip to the same normalized AST output; ${tokenSummary}`,
      };
    }
  } catch (error) {
    return { safe: false, reason: error instanceof Error ? error.message : String(error) };
  }
  return { safe: true };
}

function formatImportedTokenSummary(before: readonly Lexeme[], after: readonly Lexeme[]): string {
  const difference = describeImportedTokenDifference(before, after);
  return [
    `tokens before=${before.length}`,
    `after=${after.length}`,
    ...(difference ? [`first difference=${difference}`] : []),
  ].join(', ');
}

function describeImportedTokenDifference(before: readonly Lexeme[], after: readonly Lexeme[]): string | undefined {
  const max = Math.min(before.length, after.length);
  for (let index = 0; index < max; index += 1) {
    const token = before[index];
    const other = after[index];
    if (
      !other
      || token.type !== other.type
      || token.value !== other.value
      || JSON.stringify(token.comments ?? null) !== JSON.stringify(other.comments ?? null)
      || JSON.stringify(token.positionedComments ?? null) !== JSON.stringify(other.positionedComments ?? null)
    ) {
      return `#${index} ${JSON.stringify(token.value)} -> ${JSON.stringify(other?.value ?? null)}`;
    }
  }
  if (before.length !== after.length) {
    const token = before[max];
    const other = after[max];
    return `#${max} ${JSON.stringify(token?.value ?? null)} -> ${JSON.stringify(other?.value ?? null)}`;
  }
  return undefined;
}

function formatImportedParameterList(parameters: readonly string[]): string {
  return parameters.length > 0 ? parameters.join(',') : '(none)';
}

function missingImportedSqlCommentFragments(before: string, after: string): string[] {
  const beforeComments = extractImportedSqlCommentFragments(before);
  if (beforeComments.length === 0) return [];
  const normalizedAfter = normalizeLineEndings(after);
  return beforeComments.filter((comment) => !normalizedAfter.includes(comment));
}

function extractImportedSqlCommentFragments(sql: string): string[] {
  const normalized = normalizeLineEndings(sql);
  const lineMatches = normalized.match(/--.*$/gm) ?? [];
  const blockMatches = normalized.match(/\/\*[\s\S]*?\*\//g) ?? [];
  return [...lineMatches, ...blockMatches].map((comment) => comment.trim()).filter(Boolean);
}

function normalizeSqlText(sql: string): string {
  return `${sql.trimEnd()}\n`;
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, '\n');
}

function renderFeatureBoundaryTest(
  featureName: string,
  queryName?: string,
  plan?: ReturnType<typeof buildActionPlan>,
): string {
  if (!queryName || !plan) {
    return [
      "import { expect, test } from 'vitest';",
      '',
      "import * as boundary from '../boundary.js';",
      '',
      `test('${featureName} boundary exports executable feature entry points', () => {`,
      '  expect(Object.keys(boundary).length).toBeGreaterThan(0);',
      '});',
      '',
      `test.todo('cover ${featureName} feature input, workflow, and output behavior');`,
      '',
    ].join('\n');
  }
  const pascal = toPascal(featureName);
  const queryPascal = toPascal(queryName);
  const queryCamel = toCamel(queryName);
  const request = renderTsExpression(
    Object.fromEntries(toFeatureFields(plan.params).map((field) => [field.name, sampleFieldValue(field)])),
    2,
  );
  const expectedParams = renderTsExpression(
    Object.fromEntries(toFeatureFields(plan.params).map((field) => [field.sourceName, sampleFieldValue(field)])),
    6,
  );
  const queryResult = `[${renderTsValue(Object.fromEntries(toFeatureFields(plan.rows).map((field) => [field.sourceName, sampleFieldValue(field)])))}]`;
  const response = isManyResultAction(plan.action)
    ? renderTsExpression({ items: [Object.fromEntries(toFeatureFields(plan.rows).map((field) => [field.name, sampleFieldValue(field)]))] }, 2)
    : renderTsExpression(Object.fromEntries(toFeatureFields(plan.rows).map((field) => [field.name, sampleFieldValue(field)])), 2);
  return [
    "import { expect, test } from 'vitest';",
    '',
    "import { execute } from '../boundary.js';",
    `import type { FeatureQueryExecutor } from '${FEATURE_SHARED_EXECUTOR_IMPORT_PATH}';`,
    `import { ${queryCamel}Query, type ${queryPascal}QueryResult } from '../queries/${queryName}/query.js';`,
    '',
    `test('${featureName} rejects invalid feature input before query execution', async () => {`,
    `  const guardedExecutor: FeatureQueryExecutor<typeof ${queryCamel}Query> = {`,
    '    async query() {',
    `      throw new Error('Feature boundary tests stay mock-based for ${featureName}; keep DB-backed SQL checks in the query boundary.');`,
    '    },',
    '  };',
    '',
    '  await expect(execute(guardedExecutor, {})).rejects.toThrow();',
    '});',
    '',
    `test('${featureName} maps request through workflow and output boundary', async () => {`,
    `  const rows: ${queryPascal}QueryResult[] = ${queryResult};`,
    `  const executor: FeatureQueryExecutor<typeof ${queryCamel}Query> = {`,
    '    async query(query, params) {',
    `      expect(query.id).toBe('${queryName}');`,
    `      expect(params).toEqual(${expectedParams});`,
    '      return rows;',
    '    },',
    '  };',
    '',
    `  await expect(execute(executor, ${request})).resolves.toEqual(${response});`,
    '});',
    '',
    `// ${pascal} uses ${queryPascal} as the first query boundary. Add workflow cases here as requirements grow.`,
    '',
  ].join('\n');
}

function renderQueryZtdTest(featureName: string, queryName: string): string {
  const pascal = toPascal(queryName);
  return [
    "import { expect, test } from 'vitest';",
    '',
    `import { runQuerySpecZtdCases } from '${TEST_ZTD_HARNESS_IMPORT_PATH}';`,
    `import { execute${pascal}Query } from '../query.js';`,
    "import logicCases from './cases/logic.case.js';",
    '',
    'const cases = logicCases;',
    '',
    'const shouldSkipZtd =',
    "  process.env.ASHIBA_SKIP_DB_BACKED_TESTS === '1' ||",
    '  cases.length === 0;',
    '',
    'const testZtd = shouldSkipZtd ? test.skip : test;',
    '',
    `testZtd('${featureName}/${queryName} boundary ZTD cases run through the fixed app-level harness', async () => {`,
    '  expect(cases.length).toBeGreaterThan(0);',
    `  const evidence = await runQuerySpecZtdCases(cases, execute${pascal}Query);`,
    "  expect(evidence.every((entry) => entry.mode === 'ztd')).toBe(true);",
    '  expect(evidence.every((entry) => entry.physicalSetupUsed === false)).toBe(true);',
    '  expect(evidence.every((entry) => entry.executedQueryCount > 0)).toBe(true);',
    '});',
    '',
  ].join('\n');
}

function renderQueryZtdTypes(
  queryName: string,
  table: DdlTable,
  actionPlan: ReturnType<typeof buildActionPlan>
): string {
  const pascal = toPascal(queryName);
  const outputType = isManyResultAction(actionPlan.action) ? `${pascal}QueryResult[]` : `${pascal}QueryResult`;
  return [
    `import type { QuerySpecZtdCase } from '${TEST_ZTD_CASE_TYPES_IMPORT_PATH}';`,
    `import type { ${pascal}QueryParams, ${pascal}QueryResult } from '../query.js';`,
    '',
    `export type ${pascal}BeforeDb = {`,
    `  ${renderPropertyKey(table.schema)}: {`,
    `    ${renderPropertyKey(table.name)}: readonly {`,
    ...table.columns.map((column) => `      ${renderPropertyKey(column.name)}?: unknown;`),
    '    }[];',
    '  };',
    '};',
    '',
    `export type ${pascal}QueryBoundaryZtdCase = QuerySpecZtdCase<`,
    `  ${pascal}BeforeDb,`,
    `  ${pascal}QueryParams,`,
    `  ${outputType}`,
    '>;',
    '',
  ].join('\n');
}

function renderEmptyLogicZtdCases(queryName: string): string {
  const caseType = `${toPascal(queryName)}QueryBoundaryZtdCase`;
  return [
    `import type { ${caseType} } from '../boundary-ztd-types.js';`,
    '',
    '// Human/AI-owned SQL logic cases. Keep only expectations with measured semantic value; Ashiba will not overwrite this file.',
    `const cases: readonly ${caseType}[] = [];`,
    '',
    'export default cases;',
    '',
  ].join('\n');
}

function renderImportedQueryZtdTypes(
  queryName: string,
  tables: DdlTable | readonly DdlTable[] | undefined,
  fields: RenderContractField[],
): string {
  const pascal = toPascal(queryName);
  const physicalTables = tables ? (Array.isArray(tables) ? [...tables] : [tables]) : [];
  const tablesBySchema = new Map<string, DdlTable[]>();
  for (const table of physicalTables) {
    const schemaTables = tablesBySchema.get(table.schema) ?? [];
    schemaTables.push(table);
    tablesBySchema.set(table.schema, schemaTables);
  }
  const beforeDb = physicalTables.length > 0
    ? [
        `export type ${pascal}BeforeDb = {`,
        ...[...tablesBySchema.entries()]
          .sort(([left], [right]) => left.localeCompare(right))
          .flatMap(([schema, schemaTables]) => [
            `  ${renderPropertyKey(schema)}: {`,
            ...schemaTables
              .sort((left, right) => left.name.localeCompare(right.name))
              .flatMap((table) => [
                `    ${renderPropertyKey(table.name)}: readonly {`,
                ...table.columns.map((column) => `      ${renderPropertyKey(column.name)}?: unknown;`),
                '    }[];',
              ]),
            '  };',
          ]),
        '};',
      ]
    : [`export type ${pascal}BeforeDb = Record<string, unknown>;`];
  return [
    `import type { QuerySpecZtdCase } from '${TEST_ZTD_CASE_TYPES_IMPORT_PATH}';`,
    `import type { ${pascal}QueryParams, ${pascal}QueryResult } from '../query.js';`,
    '',
    ...beforeDb,
    '',
    `export type ${pascal}QueryBoundaryZtdCase = QuerySpecZtdCase<`,
    `  ${pascal}BeforeDb,`,
    `  ${pascal}QueryParams,`,
    `  ${pascal}QueryResult[]`,
    '>;',
    '',
    fields.length === 0
      ? '// This imported SQL has no result columns in query metadata; add human-owned logic cases when behavior must be proved.'
      : '// Add cases only for SQL behavior that static and PostgreSQL-derived contracts cannot prove.',
    '',
  ].join('\n');
}

function isNullableType(typeScriptType: string): boolean {
  return /\bnull\b/.test(typeScriptType);
}

function sqlTypeForTypeScript(typeScriptType: string): string {
  const normalized = typeScriptType.replace(/\s*\|\s*null/g, '').trim();
  if (normalized === 'number[]') return 'integer[]';
  if (normalized === 'boolean[]') return 'boolean[]';
  if (normalized === 'string[]') return 'text[]';
  if (normalized === 'number') return 'integer';
  if (normalized === 'boolean') return 'boolean';
  return 'text';
}

function sqlTypeForContract(typeName: string): string {
  const normalized = typeName.trim();
  if (/^(?:unknown|string|number|boolean)(?:\s*\|\s*null)?$/.test(normalized)) {
    return sqlTypeForTypeScript(normalized);
  }
  return normalized;
}

function inferSqlTypeForResultColumn(column: SqlResultColumnContract): string | undefined {
  const expression = column.expression?.trim();
  if (!expression) return undefined;
  const castMatch = expression.match(/^cast\([\s\S]+?\s+as\s+([A-Za-z_][A-Za-z0-9_\s]*(?:\([^)]*\))?)\)$/i);
  if (castMatch?.[1]) return castMatch[1].trim();
  const postgresCastMatch = expression.match(/::\s*([A-Za-z_][A-Za-z0-9_\s]*(?:\([^)]*\))?)\s*$/i);
  if (postgresCastMatch?.[1]) return postgresCastMatch[1].trim();
  return undefined;
}

function sampleValueForType(typeScriptType: string): unknown {
  const normalized = typeScriptType.replace(/\s*\|\s*null/g, '').trim();
  if (normalized === 'null') return null;
  if (normalized.endsWith('[]')) return [sampleValueForType(normalized.slice(0, -2))];
  if (normalized === 'number') return 1;
  if (normalized === 'boolean') return true;
  if (normalized === 'string') return 'value';
  if (normalized === 'unknown') return 'value';
  return 'value';
}

function isSqlArrayType(typeName: string): boolean {
  return /\[\]\s*$/.test(typeName.trim());
}

function renderTsValue(value: unknown): string {
  return JSON.stringify(value, null, 2)
    .replace(/\n/g, '\n')
    .replace(/^(\s*)"([^"\\]+)":/gm, (_match, indent: string, key: string) => `${indent}${renderPropertyKey(key)}:`);
}

function renderTsExpression(value: unknown, continuationIndent: number): string {
  return indentContinuation(renderTsValue(value), continuationIndent);
}

function indentContinuation(value: string, continuationIndent: number): string {
  return value.split('\n').map((line, index) => index === 0 ? line : `${' '.repeat(continuationIndent)}${line}`).join('\n');
}

function renderPropertyKey(value: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value) ? value : JSON.stringify(value);
}

function renderFeatureReadme(featureName: string, queryName: string, action: FeatureAction, table: DdlTable, primaryKeyColumn: string): string {
  return [
    `# ${featureName}`,
    '',
    `Action: ${action}`,
    `Table: ${table.canonicalName}`,
    `Primary key: ${primaryKeyColumn}`,
    `Initial query: ${queryName}`,
    '',
    'Generated code is editable after scaffolding. Keep SQL visible, named, and directly runnable in a SQL client.',
    'A feature may contain multiple query boundaries; use feature query scaffold when the behavior needs another SQL access point.',
    'Transaction policy and feature orchestration belong to application code, not Ashiba. Compose multiple query boundaries by passing the same FeatureQueryExecutor inside an application-owned transaction callback.',
    'Static and PostgreSQL-derived contract checks prove DB-to-TypeScript result contracts. Add query-local SQL logic tests selectively; for mutations, use route or integration tests for inputs, affected rows, persisted state, transactions, defaults, constraints, triggers, and read-after-write behavior.',
    '',
  ].join('\n');
}

function formatFeatureScaffoldResult(label: string, result: FeatureScaffoldResult): string {
  return formatFeatureWarnings(result.warnings)
    + formatFilePlan(`${label} ${result.dryRun ? 'plan' : 'completed'}: ${result.featureName}`, process.cwd(), result.dryRun, result.outputs);
}

function formatFeatureImportResult(result: FeatureImportResult): string {
  const lines = [
    `Feature import ${result.dryRun ? 'plan' : 'completed'}: ${result.featureName}/${result.queryName}`,
    '',
    `- source SQL: ${result.sourceSqlFile}`,
    `- imported SQL: ${result.importedSqlFile}`,
    `- formatted: ${result.formatted ? 'yes' : 'no'}`,
  ];
  if (result.formatSkippedReason) {
    lines.push(`- format skipped reason: ${result.formatSkippedReason}`);
  }
  return formatFeatureWarnings(result.warnings)
    + `${[
      ...lines,
      '',
      ...result.outputs.map((output) => `- ${output.written ? 'write' : 'plan'} ${output.kind}: ${output.path}`),
    ].join('\n')}\n`;
}

function formatFeatureWarnings(warnings: string[]): string {
  if (warnings.length === 0) return '';
  return `${warnings.join('\n\n')}\n\n`;
}

function formatFeatureQueryMetadataRefresh(result: FeatureQueryMetadataRefreshResult): string {
  return [
    `Feature query refresh ${result.dryRun ? 'plan' : 'completed'}: ${result.featureName}/${result.queryName}`,
    '',
    `- sql: ${result.sqlFile}`,
    `- query: ${result.queryFile}`,
    `- metadata: ${result.metadataFile}`,
    `- runtime SQL: ${result.sqlSourceFile}`,
    `- changed: ${result.changed ? 'yes' : 'no'}`,
    `- dry-run: ${result.dryRun ? 'true' : 'false'}`,
    '',
  ].join('\n');
}

function formatFeatureQueryPostgresContract(result: FeatureQueryPostgresContractResult): string {
  return [
    `PostgreSQL query contract ${result.dryRun ? 'plan' : 'completed'}: ${result.featureName}/${result.queryName}`,
    '',
    `- sql: ${result.sqlFile}`,
    `- contract: ${result.contractFile}`,
    `- database URL source: ${result.databaseUrlSource}`,
    `- PostgreSQL major: ${result.contract.database.serverMajor}`,
    `- driver profile: ${result.contract.driver.profile}`,
    `- parameters: ${result.contract.database.parameters.length}`,
    `- results: ${result.contract.database.results.length}`,
    `- diagnostics: ${result.contract.diagnostics.length}`,
    `- changed: ${result.changed ? 'yes' : 'no'}`,
    `- dry-run: ${result.dryRun ? 'true' : 'false'}`,
    '',
  ].join('\n');
}

function formatFilePlan(
  title: string,
  _rootDir: string,
  _dryRun: boolean,
  outputs: Array<{ path: string; written: boolean; kind: 'directory' | 'file' }>
): string {
  return `${[title, '', ...outputs.map((output) => `- ${output.written ? 'write' : 'plan'} ${output.kind}: ${output.path}`)].join('\n')}\n`;
}

function normalizeFeatureAction(action: string | undefined): FeatureAction {
  const normalized = (action ?? '').trim().toLowerCase();
  if (FEATURE_ACTIONS.includes(normalized as FeatureAction)) return normalized as FeatureAction;
  throw invalidCliInputError(
    'ASHIBA_FEATURE_ACTION_UNSUPPORTED',
    `Unsupported --action value: ${action}. v1 supports insert, update, delete, get-by-id, and list.`,
    'Use --action insert, update, delete, get-by-id, or list.',
    { action, supported: FEATURE_ACTIONS },
  );
}

function normalizeInsertReturningMode(value: string | undefined, action: FeatureAction): InsertReturningMode {
  const normalized = (value ?? 'all').trim().toLowerCase();
  if (!INSERT_RETURNING_MODES.includes(normalized as InsertReturningMode)) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_RETURNING_MODE_UNSUPPORTED',
      `Unsupported --returning value: ${value}.`,
      'Use --returning all or --returning minimal.',
      { value, supported: INSERT_RETURNING_MODES },
    );
  }
  if (action !== 'insert' && normalized !== 'all') {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_RETURNING_MODE_INSERT_ONLY',
      '--returning minimal is only supported for insert scaffolds.',
      'Use --returning minimal with --action insert, or omit --returning for other actions.',
      { action, returning: normalized },
    );
  }
  return normalized as InsertReturningMode;
}

function normalizeFeatureName(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/.test(normalized)) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_NAME_INVALID',
      'Feature name must use resource-action kebab-case, start with a letter, and look like users-insert.',
      'Rename the feature to resource-action kebab-case, for example users-insert.',
      { value },
    );
  }
  return normalized;
}

function normalizeQueryName(value: string | undefined): string {
  const normalized = (value ?? '').trim().toLowerCase();
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(normalized)) {
    throw invalidCliInputError(
      'ASHIBA_QUERY_NAME_INVALID',
      'Query name must use kebab-case, start with a letter, and look like insert-sales-detail.',
      'Pass a kebab-case query name that starts with a letter, for example insert-sales-detail.',
      { value },
    );
  }
  return normalized;
}

function deriveQueryName(tableName: string, action: FeatureAction): string {
  return action === 'get-by-id' || action === 'list' ? action : `${action}-${toKebab(tableName)}`;
}

function resolveBoundaryDir(rootDir: string, options: FeatureQueryScaffoldOptions): string {
  if (options.feature && options.boundaryDir) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_BOUNDARY_INPUT_CONFLICT',
      'Use either a feature name or --boundary-dir, not both.',
      'Choose one boundary selector and rerun the command.',
      { options: ['<feature>', '--boundary-dir'] },
    );
  }
  if (options.feature) return path.join(rootDir, options.featureRoot ?? 'src/features', normalizeFeatureName(options.feature));
  if (options.boundaryDir) return path.resolve(rootDir, options.boundaryDir);
  return options.workingDir ? path.resolve(options.workingDir) : process.cwd();
}

function resolveExplicitFeatureBoundaryDir(rootDir: string, feature: string | undefined, boundaryDir: string | undefined, commandLabel: string, featureRoot = 'src/features'): string {
  if (feature && boundaryDir) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_BOUNDARY_INPUT_CONFLICT',
      'Use either a feature name or --boundary-dir, not both.',
      'Choose one boundary selector and rerun the command.',
      { options: ['<feature>', '--boundary-dir'] },
    );
  }
  if (boundaryDir) return path.resolve(rootDir, boundaryDir);
  if (feature) return path.join(rootDir, featureRoot, normalizeFeatureName(feature));
  throw invalidCliInputError(
    'ASHIBA_FEATURE_BOUNDARY_REQUIRED',
    `${commandLabel} requires a feature name or --boundary-dir.`,
    'Pass a feature name for a top-level feature, or --boundary-dir for a subgrouped feature boundary.',
    { options: ['<feature>', '--boundary-dir'] },
  );
}

function resolvePrimaryKeyColumn(table: DdlTable): string {
  if (table.primaryKeyColumns.length === 0) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_PRIMARY_KEY_REQUIRED',
      `Table ${table.canonicalName} must declare exactly one primary key column in v1.`,
      'Add a single-column primary key to the DDL table or scaffold the query manually.',
      { table: table.canonicalName },
    );
  }
  if (table.primaryKeyColumns.length > 1) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_COMPOSITE_PRIMARY_KEY_UNSUPPORTED',
      `Composite primary keys are not supported in v1: ${table.canonicalName}.`,
      'Scaffold this query manually or adjust the v1 scaffold input to a table with one primary key column.',
      { table: table.canonicalName, primaryKeyColumns: table.primaryKeyColumns },
    );
  }
  return table.primaryKeyColumns[0];
}

function requireColumn(table: DdlTable, name: string): DdlColumn {
  const column = table.columns.find((candidate) => candidate.name === name);
  if (!column) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_COLUMN_NOT_FOUND',
      `Column ${name} was not found in ${table.canonicalName}.`,
      'Check the DDL table metadata and regenerate or adjust the scaffold input.',
      { table: table.canonicalName, column: name },
    );
  }
  return column;
}

function isGeneratedInsertColumn(column: DdlColumn, primaryKeyColumn: string): boolean {
  if (column.generated) return true;
  if (column.name !== primaryKeyColumn) return false;
  return /^(smallserial|serial|serial2|serial4|bigserial|serial8)$/i.test(column.typeName) || /^nextval\s*\(/i.test(column.defaultValue ?? '');
}

function toTsType(column: DdlColumn): string {
  const type = column.typeName.toLowerCase();
  const base = isSqlArrayType(type)
    ? 'string[]'
    : /^(smallint|integer|int|int2|int4|real|float|float4|float8|double precision|serial|serial2|serial4)$/.test(type)
    ? 'number'
    : /^(bigint|int8|bigserial|serial8|numeric|decimal)$/.test(type)
      ? 'string'
      : /^(boolean|bool)$/.test(type)
        ? 'boolean'
        : 'string';
  return column.nullable ? `${base} | null` : base;
}

function splitQualifiedName(value: string): [string, string] {
  const segments = value.split('.');
  if (segments.length === 1) return ['public', normalizeIdentifier(segments[0])];
  return [normalizeIdentifier(segments[0]), normalizeIdentifier(segments[1])];
}

function normalizeIdentifier(value: string): string {
  return value.trim().replace(/^"/, '').replace(/"$/, '');
}

function quoteQualifiedName(value: string): string {
  return value.split('.').map(quoteIdentifier).join('.');
}

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function toKebab(value: string): string {
  return normalizeIdentifier(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
}

function toPascal(value: string): string {
  return toKebab(value).split('-').map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join('');
}

function toCamel(value: string): string {
  const pascal = toPascal(value);
  return `${pascal.charAt(0).toLowerCase()}${pascal.slice(1)}`;
}

function featureNameFromBoundary(boundary: string): string {
  return boundary.split('/').filter(Boolean).at(-1) ?? 'feature';
}

function toProjectPath(rootDir: string, fullPath: string): string {
  return path.relative(rootDir, fullPath).replace(/\\/g, '/');
}

function requireValue(value: string | undefined, label: string): string {
  if (!value || value.trim().length === 0) throw requiredCliValueError(label);
  return value;
}
