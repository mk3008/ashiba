import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import { compileNamedParameters } from '../parameter-metadata.js';
import {
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
  type ValueComponent,
  type Lexeme,
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

const FEATURE_SHARED_EXECUTOR_IMPORT_PATH = '#features/_shared/featureQueryExecutor.js';
const FEATURE_SHARED_LOAD_SQL_RESOURCE_IMPORT_PATH = '#features/_shared/loadSqlResource.js';
const TEST_ZTD_CASE_TYPES_IMPORT_PATH = '#tests/support/ztd/case-types.js';
const TEST_ZTD_HARNESS_IMPORT_PATH = '#tests/support/ztd/harness.js';

const FEATURE_ACTIONS = ['insert', 'update', 'delete', 'get-by-id', 'list'] as const;
type FeatureAction = (typeof FEATURE_ACTIONS)[number];
const defaultSqlFormatter = new SqlFormatter(DEFAULT_SQL_FORMAT_OPTIONS);

export interface FeatureScaffoldOptions {
  table?: string;
  action?: string;
  featureName?: string;
  rootDir?: string;
  dryRun?: boolean;
  force?: boolean;
}

export interface FeatureQueryScaffoldOptions {
  table?: string;
  action?: string;
  queryName?: string;
  feature?: string;
  boundaryDir?: string;
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
  rootDir?: string;
  dryRun?: boolean;
  format?: 'text' | 'json';
}

export interface FeatureTestsScaffoldOptions {
  feature?: string;
  boundaryDir?: string;
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
  outputs: Array<{ path: string; written: boolean; kind: 'directory' | 'file' }>;
}

export interface FeatureQueryMetadataRefreshResult {
  rootDir: string;
  featureName: string;
  queryName: string;
  sqlFile: string;
  queryFile: string;
  metadataFile: string;
  dryRun: boolean;
  changed: boolean;
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
  importSource?: 'existing-sql';
}

type ScaffoldQueryTestMetadata = QueryTestMetadata & {
  action: FeatureAction;
  table: string;
  primaryKeyColumn: string;
  importSource?: undefined;
};

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
  const tests = feature.command('tests').description('Scaffold feature-local mapper test files');
  const generatedMapper = feature.command('generated-mapper').description('Check editable generated mapper drift');

  feature
    .command('scaffold <name>')
    .description('Scaffold a feature-local CRUD or SELECT boundary from DDL metadata')
    .requiredOption('--table <table>', 'Target table name')
    .requiredOption('--action <action>', 'Action: insert, update, delete, get-by-id, or list')
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
      const result = runFeatureQueryMetadataRefresh({ ...options, feature: featureName, query: queryName });
      if (options.format === 'json') {
        process.stdout.write(`${JSON.stringify({ kind: 'feature-query-refresh', ...result }, null, 2)}\n`);
        return;
      }
      process.stdout.write(formatFeatureQueryMetadataRefresh(result));
    });

  tests
    .command('scaffold <feature>')
    .description('Scaffold editable mapper test files and library-owned generated test schema files')
    .option('--query <name>', 'Limit scaffolding to one query boundary')
    .option('--root-dir <path>', 'Project root directory', '.')
    .option('--dry-run', 'Print the files that would be created without writing them', false)
    .option('--force', 'Overwrite scaffold-owned test files when they already exist', false)
    .action((featureName: string, options: FeatureTestsScaffoldOptions) => {
      const result = runFeatureTestsScaffold({ ...options, feature: featureName });
      process.stdout.write(formatFilePlan('Feature tests scaffold', result.rootDir, result.dryRun, result.outputs));
    });

  tests
    .command('check [feature]')
    .description('Detect missing or drifted generated mapping test assets')
    .option('--boundary-dir <path>', 'Explicit feature boundary directory, including subgrouped boundaries')
    .option('--query <name>', 'Limit check to one query boundary')
    .option('--root-dir <path>', 'Project root directory', '.')
    .option('--fix', 'Rewrite generated mapping test assets and create missing logic-case stubs', false)
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

  generatedMapper
    .command('check [feature]')
    .description('Check SQL named parameters against editable generated query mapper contracts')
    .option('--boundary-dir <path>', 'Limit drift check to one explicit feature boundary directory, including subgrouped boundaries')
    .option('--query <name>', 'Limit drift check to one query boundary')
    .option('--root-dir <path>', 'Project root directory', '.')
    .option('--format <format>', 'Output format: text or json', 'text')
    .action((featureName: string | undefined, options: FeatureGeneratedMapperCheckOptions) => {
      const result = runFeatureGeneratedMapperCheck(withConfiguredFeatureRoot({ ...options, feature: featureName ?? options.feature }));
      if (options.format === 'json') {
        process.stdout.write(`${JSON.stringify({ kind: 'feature-generated-mapper-check', ...result }, null, 2)}\n`);
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
  const table = loadDdlTable(rootDir, requireValue(options.table, '--table'));
  const primaryKeyColumn = resolvePrimaryKeyColumn(table);
  const featureName = normalizeFeatureName(options.featureName ?? `${toKebab(table.name)}-${action}`);
  const queryName = deriveQueryName(table.name, action);
  const files = buildFeatureFiles(rootDir, featureName, queryName, action, table, primaryKeyColumn);
  const outputs = writeGeneratedFiles(rootDir, files, options.dryRun === true, options.force === true);

  return {
    featureName,
    queryName,
    action,
    table: table.canonicalName,
    primaryKeyColumn,
    dryRun: options.dryRun === true,
    outputs,
  };
}

/**
 * Adds a query boundary to an existing feature and generates its metadata.
 */
export function runFeatureQueryScaffold(options: FeatureQueryScaffoldOptions): FeatureScaffoldResult {
  const rootDir = path.resolve(options.rootDir ?? '.');
  const action = normalizeFeatureAction(options.action);
  const table = loadDdlTable(rootDir, requireValue(options.table, '--table'));
  const primaryKeyColumn = resolvePrimaryKeyColumn(table);
  const queryName = normalizeQueryName(options.queryName);
  const boundaryDir = resolveBoundaryDir(rootDir, options);
  const relativeBoundary = toProjectPath(rootDir, boundaryDir);

  if (!existsSync(path.join(boundaryDir, 'boundary.ts'))) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_BOUNDARY_FILE_MISSING',
      `Boundary directory must contain boundary.ts: ${relativeBoundary}.`,
      'Run feature scaffold first, then pass the feature name to feature query scaffold.',
      { boundaryDir: relativeBoundary },
    );
  }

  const files = buildQueryFiles(rootDir, relativeBoundary, queryName, action, table, primaryKeyColumn);
  const outputs = writeGeneratedFiles(rootDir, files, options.dryRun === true, options.force === true);
  const featureName = path.basename(boundaryDir);

  return {
    featureName,
    queryName,
    action,
    table: table.canonicalName,
    primaryKeyColumn,
    dryRun: options.dryRun === true,
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
      contents: renderImportedQueryBoundary(queryName, parameters, parameterTypes, resultColumnContracts),
    },
    { relativePath: `${relativeQueryDir}/generated`, kind: 'directory' },
    {
      relativePath: `${relativeQueryDir}/generated/query.meta.ts`,
      kind: 'file',
      contents: renderQueryMetadata(queryModel),
      overwrite: true,
    },
    { relativePath: `${relativeQueryDir}/tests`, kind: 'directory' },
    { relativePath: `${relativeQueryDir}/tests/cases`, kind: 'directory' },
    { relativePath: `${relativeQueryDir}/tests/generated`, kind: 'directory' },
    {
      relativePath: `${relativeQueryDir}/tests/${queryName}.boundary.ztd.test.ts`,
      kind: 'file',
      contents: renderQueryZtdTest(featureName, queryName),
      overwrite: false,
    },
    {
      relativePath: `${relativeQueryDir}/tests/cases/logic.case.ts`,
      kind: 'file',
      contents: renderEmptyLogicZtdCases(queryName),
      overwrite: false,
    },
    { relativePath: `${relativeQueryDir}/tests/cases/.gitkeep`, kind: 'file', contents: '', overwrite: false },
    ...buildImportedMappingTestFiles(rootDir, relativeFeatureDir, featureName, queryName, importedSql, parameters, parameterTypes, resultColumnContracts),
  ];
  const outputs = writeGeneratedFiles(rootDir, files, options.dryRun === true, options.force === true);
  return {
    featureName,
    queryName,
    sourceSqlFile: toProjectPath(rootDir, sourceSqlPath),
    importedSqlFile: `${relativeQueryDir}/${queryName}.sql`,
    dryRun: options.dryRun === true,
    formatted: formatted.formatted,
    ...(formatted.reason ? { formatSkippedReason: formatted.reason } : {}),
    outputs,
  };
}

/**
 * Refreshes the generated query metadata file after a SQL-only edit.
 */
export function runFeatureQueryMetadataRefresh(options: FeatureQueryMetadataRefreshOptions): FeatureQueryMetadataRefreshResult {
  const rootDir = path.resolve(options.rootDir ?? '.');
  const boundaryDir = resolveExplicitFeatureBoundaryDir(rootDir, options.feature, options.boundaryDir, 'feature query refresh');
  const featureName = path.basename(boundaryDir);
  const queryName = normalizeQueryName(requireValue(options.query, '--query'));
  const queryDir = path.join(boundaryDir, 'queries', queryName);
  const sqlPath = path.join(queryDir, `${queryName}.sql`);
  const queryPath = path.join(queryDir, 'query.ts');
  const metadataPath = path.join(queryDir, 'generated', 'query.meta.ts');
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

  const sql = readFileSync(sqlPath, 'utf8');
  const queryModel = buildFeatureQueryModel(sql, rootDir);
  const refreshedSource = renderQueryMetadata(queryModel);
  const existingSource = existsSync(metadataPath) ? readFileSync(metadataPath, 'utf8') : '';
  const changed = refreshedSource !== existingSource;
  if (!options.dryRun && changed) {
    mkdirSync(path.dirname(metadataPath), { recursive: true });
    writeFileSync(metadataPath, refreshedSource, 'utf8');
  }

  return {
    rootDir,
    featureName,
    queryName,
    sqlFile: toProjectPath(rootDir, sqlPath),
    queryFile: toProjectPath(rootDir, queryPath),
    metadataFile: toProjectPath(rootDir, metadataPath),
    dryRun: options.dryRun === true,
    changed,
  };
}

/**
 * Scaffolds mapping and logic test files for existing feature queries.
 */
export function runFeatureTestsScaffold(options: FeatureTestsScaffoldOptions): {
  rootDir: string;
  dryRun: boolean;
  outputs: Array<{ path: string; written: boolean; kind: 'directory' | 'file' }>;
} {
  const rootDir = path.resolve(options.rootDir ?? '.');
  const featureDir = resolveExplicitFeatureBoundaryDir(rootDir, options.feature, options.boundaryDir, 'feature tests scaffold');
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
    const resolvedMetadata = resolveQueryTestMetadata(rootDir, featureName, queryName, queryDir);
    if (resolvedMetadata) {
      const generatedFiles = buildExpectedGeneratedMappingTestFiles(rootDir, relativeFeatureDir, queryName, queryDir, resolvedMetadata.metadata);
      files.push(
        { relativePath: `${relativeFeatureDir}/queries/${queryName}/tests`, kind: 'directory' },
        { relativePath: `${relativeFeatureDir}/queries/${queryName}/tests/cases`, kind: 'directory' },
        { relativePath: `${relativeFeatureDir}/queries/${queryName}/tests/generated`, kind: 'directory' },
        ...generatedFiles,
        {
          relativePath: `${relativeFeatureDir}/queries/${queryName}/tests/cases/logic.case.ts`,
          kind: 'file',
          contents: renderEmptyLogicZtdCases(queryName),
          overwrite: false,
        },
        { relativePath: `${relativeFeatureDir}/queries/${queryName}/tests/cases/.gitkeep`, kind: 'file', contents: '', overwrite: false },
      );
      continue;
    }
    files.push(
      { relativePath: `${relativeFeatureDir}/queries/${queryName}/tests`, kind: 'directory' },
      { relativePath: `${relativeFeatureDir}/queries/${queryName}/tests/cases`, kind: 'directory' },
      { relativePath: `${relativeFeatureDir}/queries/${queryName}/tests/generated`, kind: 'directory' },
      {
        relativePath: `${relativeFeatureDir}/queries/${queryName}/tests/${queryName}.boundary.ztd.test.ts`,
        kind: 'file',
        contents: renderQueryZtdTest(featureName, queryName),
        overwrite: false,
      },
      {
        relativePath: `${relativeFeatureDir}/queries/${queryName}/tests/cases/logic.case.ts`,
        kind: 'file',
        contents: renderEmptyLogicZtdCases(queryName),
        overwrite: false,
      },
      { relativePath: `${relativeFeatureDir}/queries/${queryName}/tests/cases/.gitkeep`, kind: 'file', contents: '', overwrite: false },
      {
        relativePath: `${relativeFeatureDir}/queries/${queryName}/tests/generated/TEST_PLAN.md`,
        kind: 'file',
        contents: renderGeneratedTestPlan(featureName, queryName),
        overwrite: true,
      },
      {
        relativePath: `${relativeFeatureDir}/queries/${queryName}/tests/generated/analysis.json`,
        kind: 'file',
        contents: `${JSON.stringify({ feature: featureName, query: queryName, status: 'generated-empty-cases' }, null, 2)}\n`,
        overwrite: true,
      }
    );
  }

  const outputs = writeGeneratedFiles(rootDir, files, options.dryRun === true, options.force === true);
  return { rootDir, dryRun: options.dryRun === true, outputs };
}

/**
 * Checks generated feature test coverage against discovered query metadata.
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
      const resolvedMetadata = resolveQueryTestMetadata(rootDir, featureName, queryName, queryDir);
      const issues: string[] = [];
      const fixed: string[] = [];
      if (!resolvedMetadata) {
        checked.push({
          feature: featureName,
          query: queryName,
          ok: false,
          issues: [`Generated test analysis is missing or unreadable and could not be inferred from SQL: ${relativeQueryDir}/tests/generated/analysis.json.`],
          fixed,
        });
        continue;
      }

      const { metadata, inferred } = resolvedMetadata;
      if (inferred) {
        const analysisPath = `${relativeQueryDir}/tests/generated/analysis.json`;
        issues.push(`Missing or unreadable generated mapping test analysis: ${analysisPath}.`);
        if (options.fix) fixed.push(analysisPath);
      }

      const expectedFiles = buildExpectedGeneratedMappingTestFiles(rootDir, toProjectPath(rootDir, featureDir), queryName, queryDir, metadata);
      for (const file of expectedFiles) {
        const fullPath = path.join(rootDir, file.relativePath);
        const expected = file.contents ?? '';
        if (!existsSync(fullPath)) {
          issues.push(`Missing generated mapping test asset: ${file.relativePath}.`);
          if (options.fix) fixed.push(file.relativePath);
          continue;
        }
        if (readFileSync(fullPath, 'utf8') !== expected) {
          issues.push(`Drifted generated mapping test asset: ${file.relativePath}.`);
          if (options.fix) fixed.push(file.relativePath);
        }
      }

      const logicCasePath = `${toProjectPath(rootDir, featureDir)}/queries/${queryName}/tests/cases/logic.case.ts`;
      if (!existsSync(path.join(rootDir, logicCasePath))) {
        issues.push(`Missing human-owned logic case stub: ${logicCasePath}.`);
        if (options.fix) fixed.push(logicCasePath);
      }

      if (options.fix && fixed.length > 0) {
        writeGeneratedFiles(rootDir, expectedFiles, false, true);
        if (!existsSync(path.join(rootDir, logicCasePath))) {
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
        ok: issues.length === 0 || (options.fix === true && fixed.length > 0),
        issues,
        fixed,
      });
    }
  }

  if (checked.length === 0) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_QUERY_TESTS_NOT_FOUND',
      'No feature query test boundaries were discovered for tests check.',
      'Run feature scaffold/query scaffold first, or pass a feature positional value, --boundary-dir, or --query for an existing feature query boundary.',
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
 * Checks generated mapper tests for drift against DDL-derived mapping expectations.
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
      const sqlParameters = [...new Set(compileNamedParameters(readFileSync(sqlFile, 'utf8')).orderedNames)].sort();
      const sql = readFileSync(sqlFile, 'utf8');
      const querySource = readFileSync(queryFile, 'utf8');
      const mapperParameters = extractMapperParameters(querySource, queryName).sort();
      const mapperParameterTypes = extractMapperParameterTypes(querySource, queryName);
      const parameterInference = ddlModel ? inferSqlParameterTypes(sql, ddlModel, schemaPath) : undefined;
      const sqlParameterTypes = parameterInference?.parameterTypes ?? {};
      const certainParameters = new Set(
        (parameterInference?.bindings ?? [])
          .filter((binding) => binding.confidence === 'certain')
          .map((binding) => binding.parameter)
      );
      const mismatchedParameterTypes = Object.entries(sqlParameterTypes)
        .filter(([parameter]) => mapperParameters.includes(parameter))
        .filter(([parameter]) => certainParameters.has(parameter))
        .filter(([parameter, expectedType]) => !areTypeScriptTypesCompatible(mapperParameterTypes[parameter] ?? 'unknown', expectedType))
        .map(([parameter, expectedType]) => `${parameter}: mapper ${mapperParameterTypes[parameter] ?? 'unknown'} / SQL ${expectedType}`);
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
      const sqlResultColumns = extractSqlResultColumns(sql).sort();
      const mapperResultColumns = extractMapperResultColumns(querySource, queryName).sort();
      const queryTestMetadata = readQueryTestMetadata(queryDir);
      const resultTypesShouldBeConservative = queryTestMetadata?.importSource === 'existing-sql';
      const importedDdlTable = queryTestMetadata?.importSource === 'existing-sql' && queryTestMetadata.table
        ? loadOptionalDdlTable(rootDir, queryTestMetadata.table)
        : undefined;
      const resultNullabilityByColumn = resultTypesShouldBeConservative
        ? inferImportedResultNullabilityByColumn(buildQueryResultColumnContracts(sql, rootDir), importedDdlTable)
        : {};
      const metadataResultTypeOverrides = queryTestMetadata
        ? buildMetadataBackedResultTypeOverrides(rootDir, queryTestMetadata)
        : undefined;
      const sqlResultTypes: Record<string, string> = Object.fromEntries(
        buildQueryResultColumnContracts(sql, rootDir)
          .map((column): [string, string] => {
            const nullability = resultNullabilityByColumn[column.name] ?? 'unknown';
            const contractType = resultTypesShouldBeConservative && nullability !== 'non-null'
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
      });
    }
  }

  if (checked.length === 0) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_QUERY_BOUNDARIES_NOT_FOUND',
      'No feature query boundaries were discovered for generated mapper drift check.',
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
    ),
  };
}

function buildFeatureFiles(
  rootDir: string,
  featureName: string,
  queryName: string,
  action: FeatureAction,
  table: DdlTable,
  primaryKeyColumn: string
): GeneratedFile[] {
  const boundary = `src/features/${featureName}`;
  const actionPlan = buildActionPlan(action, table, primaryKeyColumn);
  return [
    ...buildSharedFiles(),
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
    ...buildQueryFiles(rootDir, boundary, queryName, action, table, primaryKeyColumn),
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

function readQueryTestMetadata(queryDir: string): QueryTestMetadata | undefined {
  const analysisPath = path.join(queryDir, 'tests', 'generated', 'analysis.json');
  if (!existsSync(analysisPath)) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(analysisPath, 'utf8')) as Partial<QueryTestMetadata>;
    if (typeof parsed.feature !== 'string' || typeof parsed.query !== 'string') {
      return undefined;
    }
    if (parsed.importSource === 'existing-sql') {
      return {
        feature: parsed.feature,
        query: parsed.query,
        ...(typeof parsed.action === 'string' && FEATURE_ACTIONS.includes(parsed.action as FeatureAction)
          ? { action: parsed.action as FeatureAction }
          : {}),
        ...(typeof parsed.table === 'string' ? { table: parsed.table } : {}),
        ...(typeof parsed.primaryKeyColumn === 'string' ? { primaryKeyColumn: parsed.primaryKeyColumn } : {}),
        importSource: 'existing-sql',
      };
    }
    if (
      typeof parsed.action === 'string' &&
      FEATURE_ACTIONS.includes(parsed.action as FeatureAction) &&
      typeof parsed.table === 'string' &&
      typeof parsed.primaryKeyColumn === 'string'
    ) {
      return {
        feature: parsed.feature,
        query: parsed.query,
        action: parsed.action as FeatureAction,
        table: parsed.table,
        primaryKeyColumn: parsed.primaryKeyColumn,
      };
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function resolveQueryTestMetadata(
  rootDir: string,
  featureName: string,
  queryName: string,
  queryDir: string,
): ResolvedQueryTestMetadata | undefined {
  const metadata = readQueryTestMetadata(queryDir);
  if (metadata) return { metadata, inferred: false };
  const inferred = inferQueryTestMetadataFromSql(rootDir, featureName, queryName, queryDir);
  return inferred ? { metadata: inferred, inferred: true } : undefined;
}

function buildMetadataBackedResultTypeOverrides(rootDir: string, metadata: QueryTestMetadata): Record<string, string> | undefined {
  if (metadata.importSource === 'existing-sql' || !metadata.action || !metadata.table || !metadata.primaryKeyColumn) {
    return undefined;
  }
  const table = loadDdlTable(rootDir, metadata.table);
  const actionPlan = buildActionPlan(metadata.action, table, metadata.primaryKeyColumn);
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
  const sql = readFileSync(sqlPath, 'utf8');
  const statement = parseFeatureQuerySql(sql);
  const tableName = extractRootTableName(statement);
  if (!tableName) {
    return {
      feature: featureName,
      query: queryName,
      importSource: 'existing-sql',
    };
  }
  const table = loadDdlTable(rootDir, tableName);
  const primaryKeyColumn = resolvePrimaryKeyColumn(table);
  const action = inferFeatureAction(statement, queryName);
  return {
    feature: featureName,
    query: queryName,
    action,
    table: table.canonicalName,
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
      message: 'Query AST parse failed while reading generated mapping test metadata.',
      reason,
      sqlKind: 'SQL',
      operation: 'inferring feature generated mapping test metadata',
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
    'Generated mapping test metadata inference supports SELECT/INSERT/UPDATE/DELETE query boundaries only.',
    'Keep generated mapping tests tied to a single scaffolded query boundary, or regenerate the query metadata explicitly.',
    { queryName, statementType: statement.constructor.name },
  );
}

function buildGeneratedMappingTestFiles(
  relativeFeatureDir: string,
  metadata: ScaffoldQueryTestMetadata,
  table: DdlTable,
  actionPlan: ReturnType<typeof buildActionPlan>,
): GeneratedFile[] {
  const queryDir = `${relativeFeatureDir}/queries/${metadata.query}`;
  return [
    {
      relativePath: `${queryDir}/tests/${metadata.query}.boundary.ztd.test.ts`,
      kind: 'file',
      contents: renderQueryZtdTest(metadata.feature, metadata.query),
      overwrite: false,
    },
    {
      relativePath: `${queryDir}/tests/boundary-ztd-types.ts`,
      kind: 'file',
      contents: renderQueryZtdTypes(metadata.query, table, actionPlan),
      overwrite: true,
    },
    {
      relativePath: `${queryDir}/tests/generated/TEST_PLAN.md`,
      kind: 'file',
      contents: renderGeneratedTestPlan(metadata.feature, metadata.query),
      overwrite: true,
    },
    {
      relativePath: `${queryDir}/tests/generated/mapping.cases.ts`,
      kind: 'file',
      contents: renderGeneratedMappingZtdCases(metadata.query, actionPlan, table, metadata.primaryKeyColumn),
      overwrite: true,
    },
    {
      relativePath: `${queryDir}/tests/generated/analysis.json`,
      kind: 'file',
      contents: renderGeneratedTestAnalysis(metadata.feature, metadata.query, metadata.action, table, metadata.primaryKeyColumn, actionPlan),
      overwrite: true,
    },
  ];
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
  if (mapper === 'unknown') {
    return {
      severity: 'error',
      message: `${options.column}: mapper ${options.mapperType} / SQL ${options.expectedSqlType}`,
    };
  }
  if (mapper === expected) return undefined;

  const mapperBase = stripNullableType(mapper);
  const expectedBase = stripNullableType(expected);
  if (mapperBase !== expectedBase) {
    return {
      severity: 'error',
      message: `${options.column}: mapper ${options.mapperType} / SQL ${options.expectedSqlType}`,
    };
  }

  if (!isNullableType(expected) && isNullableType(mapper)) {
    return undefined;
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
  const lines = [`Feature generated mapper check: ${result.ok ? 'ok' : 'failed'}`];
  for (const entry of result.checked) {
    lines.push('', `- ${entry.feature}/${entry.query}`);
    lines.push(`  sql: ${entry.sqlFile}`);
    lines.push(`  mapper: ${entry.queryFile}`);
    lines.push(`  sql parameters: ${entry.sqlParameters.length > 0 ? entry.sqlParameters.join(', ') : '(none)'}`);
    lines.push(`  mapper parameters: ${entry.mapperParameters.length > 0 ? entry.mapperParameters.join(', ') : '(none)'}`);
    if (Object.keys(entry.sqlParameterTypes).length > 0) {
      lines.push(`  sql parameter types: ${formatTypeMap(entry.sqlParameterTypes)}`);
    }
    if (Object.keys(entry.mapperParameterTypes).length > 0) {
      lines.push(`  mapper parameter types: ${formatTypeMap(entry.mapperParameterTypes)}`);
    }
    lines.push(`  sql result columns: ${entry.sqlResultColumns.length > 0 ? entry.sqlResultColumns.join(', ') : '(none)'}`);
    lines.push(`  mapper result columns: ${entry.mapperResultColumns.length > 0 ? entry.mapperResultColumns.join(', ') : '(none)'}`);
    if (Object.keys(entry.sqlResultTypes).length > 0) {
      lines.push(`  sql result types: ${formatTypeMap(entry.sqlResultTypes)}`);
    }
    if (Object.keys(entry.mapperResultTypes).length > 0) {
      lines.push(`  mapper result types: ${formatTypeMap(entry.mapperResultTypes)}`);
    }
    if (entry.missingInMapper.length > 0) {
      lines.push(`  missing in mapper: ${entry.missingInMapper.join(', ')}`);
    }
    if (entry.unusedInMapper.length > 0) {
      lines.push(`  unused in mapper: ${entry.unusedInMapper.join(', ')}`);
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
      lines.push(`  missing result in mapper: ${entry.missingResultInMapper.join(', ')}`);
    }
    if (entry.unusedResultInMapper.length > 0) {
      lines.push(`  unused result in mapper: ${entry.unusedResultInMapper.join(', ')}`);
    }
    if (entry.mismatchedResultTypes.length > 0) {
      lines.push(`  mismatched result types: ${entry.mismatchedResultTypes.join(', ')}`);
    }
    if (entry.warningResultTypeMismatches.length > 0) {
      lines.push(`  warning result type mismatches: ${entry.warningResultTypeMismatches.join(', ')}`);
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
  primaryKeyColumn: string
): GeneratedFile[] {
  const queryDir = `${boundary}/queries/${queryName}`;
  const actionPlan = buildActionPlan(action, table, primaryKeyColumn);
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
    { relativePath: `${queryDir}/tests`, kind: 'directory' },
    { relativePath: `${queryDir}/tests/cases`, kind: 'directory' },
    { relativePath: `${queryDir}/tests/generated`, kind: 'directory' },
    {
      relativePath: `${queryDir}/tests/${queryName}.boundary.ztd.test.ts`,
      kind: 'file',
      contents: renderQueryZtdTest(featureNameFromBoundary(boundary), queryName),
      overwrite: false,
    },
    {
      relativePath: `${queryDir}/tests/boundary-ztd-types.ts`,
      kind: 'file',
      contents: renderQueryZtdTypes(queryName, table, actionPlan),
      overwrite: false,
    },
    {
      relativePath: `${queryDir}/tests/generated/mapping.cases.ts`,
      kind: 'file',
      contents: renderGeneratedMappingZtdCases(queryName, actionPlan, table, primaryKeyColumn),
      overwrite: true,
    },
    {
      relativePath: `${queryDir}/tests/cases/logic.case.ts`,
      kind: 'file',
      contents: renderEmptyLogicZtdCases(queryName),
      overwrite: false,
    },
    { relativePath: `${queryDir}/tests/cases/.gitkeep`, kind: 'file', contents: '', overwrite: false },
    {
      relativePath: `${queryDir}/tests/generated/TEST_PLAN.md`,
      kind: 'file',
      contents: renderGeneratedTestPlan(featureNameFromBoundary(boundary), queryName),
      overwrite: true,
    },
      {
        relativePath: `${queryDir}/tests/generated/analysis.json`,
        kind: 'file',
      contents: renderGeneratedTestAnalysis(featureNameFromBoundary(boundary), queryName, action, table, primaryKeyColumn, actionPlan),
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

function buildImportedMappingTestFiles(
  rootDir: string,
  relativeFeatureDir: string,
  featureName: string,
  queryName: string,
  sql: string,
  parameters: string[],
  parameterTypes: Record<string, string>,
  resultColumnContracts: SqlResultColumnContract[],
): GeneratedFile[] {
  const queryDir = `${relativeFeatureDir}/queries/${queryName}`;
  const inferred = inferImportedQueryTestMetadata(rootDir, featureName, queryName, sql);
  const fields = toContractFields(resultColumnContracts, inferImportedResultNullabilityByColumn(resultColumnContracts, inferred?.table));
  const cases = buildImportedMappingZtdCases(queryName, inferred?.table, inferred?.primaryKeyColumn, parameters, parameterTypes, fields);
  return [
    {
      relativePath: `${queryDir}/tests/boundary-ztd-types.ts`,
      kind: 'file',
      contents: renderImportedQueryZtdTypes(queryName, inferred?.table, fields),
      overwrite: true,
    },
    {
      relativePath: `${queryDir}/tests/generated/mapping.cases.ts`,
      kind: 'file',
      contents: renderImportedGeneratedMappingZtdCases(queryName, cases),
      overwrite: true,
    },
    {
      relativePath: `${queryDir}/tests/generated/TEST_PLAN.md`,
      kind: 'file',
      contents: renderGeneratedTestPlan(featureName, queryName),
      overwrite: true,
    },
    {
      relativePath: `${queryDir}/tests/generated/analysis.json`,
      kind: 'file',
      contents: renderImportedGeneratedTestAnalysis(featureName, queryName, inferred, parameters, parameterTypes, fields),
      overwrite: true,
    },
  ];
}

function buildExpectedGeneratedMappingTestFiles(
  rootDir: string,
  relativeFeatureDir: string,
  queryName: string,
  queryDir: string,
  metadata: QueryTestMetadata,
): GeneratedFile[] {
  if (metadata.importSource === 'existing-sql') {
    const sqlPath = path.join(queryDir, `${queryName}.sql`);
    const sql = readFileSync(sqlPath, 'utf8');
    const queryModel = buildFeatureQueryModel(sql, rootDir);
    const resultColumnContracts = buildQueryResultColumnContracts(sql, rootDir);
    return buildImportedMappingTestFiles(
      rootDir,
      relativeFeatureDir,
      metadata.feature,
      queryName,
      sql,
      queryModel.analysis.namedParameters,
      queryModel.analysis.parameterTypes ?? {},
      resultColumnContracts,
    );
  }
  if (!metadata.action || !metadata.table || !metadata.primaryKeyColumn) {
    return [];
  }
  const scaffoldMetadata: ScaffoldQueryTestMetadata = {
    feature: metadata.feature,
    query: metadata.query,
    action: metadata.action,
    table: metadata.table,
    primaryKeyColumn: metadata.primaryKeyColumn,
  };
  const table = loadDdlTable(rootDir, scaffoldMetadata.table);
  const actionPlan = buildActionPlan(scaffoldMetadata.action, table, scaffoldMetadata.primaryKeyColumn);
  return buildGeneratedMappingTestFiles(relativeFeatureDir, scaffoldMetadata, table, actionPlan);
}

function inferImportedQueryTestMetadata(
  rootDir: string,
  featureName: string,
  queryName: string,
  sql: string,
): { feature: string; query: string; action: FeatureAction; table: DdlTable; primaryKeyColumn: string } | undefined {
  const statement = parseFeatureQuerySql(sql);
  const tableName = extractRootTableName(statement);
  if (!tableName) return undefined;
  const table = loadDdlTable(rootDir, tableName);
  const primaryKeyColumn = resolvePrimaryKeyColumn(table);
  const action = inferFeatureAction(statement, queryName);
  return { feature: featureName, query: queryName, action, table, primaryKeyColumn };
}

function renderImportedGeneratedTestAnalysis(
  featureName: string,
  queryName: string,
  inferred: { action: FeatureAction; table: DdlTable; primaryKeyColumn: string } | undefined,
  parameters: string[],
  parameterTypes: Record<string, string>,
  fields: RenderContractField[],
): string {
  const generatedCaseNames = buildImportedMappingZtdCases(
    queryName,
    inferred?.table,
    inferred?.primaryKeyColumn,
    parameters,
    parameterTypes,
    fields,
  ).map((entry) => hasStringName(entry) ? entry.name : 'unknown');
  return `${JSON.stringify({
    feature: featureName,
    query: queryName,
    ...(inferred
      ? {
          action: inferred.action,
          table: inferred.table.canonicalName,
          primaryKeyColumn: inferred.primaryKeyColumn,
        }
      : {}),
    importSource: 'existing-sql',
    mappingCaseSignature: {
      query: queryName,
      action: inferred?.action ?? 'unknown',
      table: inferred?.table.canonicalName ?? null,
      primaryKeyColumn: inferred?.primaryKeyColumn ?? null,
      params: parameters.map((name) => ({ name, typeScriptType: parameterTypes[name] ?? 'unknown' })),
      rows: fields,
      generatedCaseNames,
    },
    status: inferred ? 'generated-from-imported-sql' : 'generated-from-imported-sql-without-root-table',
  }, null, 2)}\n`;
}

function buildSharedFiles(featureRoot = 'src/features'): GeneratedFile[] {
  return [
    { relativePath: `${featureRoot}/_shared`, kind: 'directory' },
    {
      relativePath: `${featureRoot}/_shared/featureQueryExecutor.ts`,
      kind: 'file',
      overwrite: false,
      contents: [
        'export type FeatureQueryModel = {',
        '  analysis: {',
        "    astParse: 'ok';",
        "    statementKind: 'select' | 'insert' | 'update' | 'delete' | 'unknown';",
        "    rootQueryShape?: 'simple-select' | 'compound-select' | 'values' | 'non-select' | 'unknown';",
        '    hasTopLevelOrderBy: boolean;',
        '    sourceHash?: string;',
        '    resultColumnTypes?: Record<string, string>;',
        '    parameterTypes?: Record<string, string>;',
        '  };',
        '  bindings?: {',
        '    postgres?: { sourceHash?: string; sql: string; orderedNames: readonly string[] };',
        '  };',
        '};',
        '',
        'export interface FeatureQuerySource {',
        '  id: string;',
        '  path: string;',
        '  sqlPath: string;',
        '  sql: string;',
        '  queryModel: FeatureQueryModel;',
        '  optionalConditionCompression?: boolean;',
        '  metadata?: {',
        '    sqlId?: string;',
        '    queryId?: string;',
        '    sqlFile?: string;',
        '    sqlPath?: string;',
        '    dialect?: string;',
        '  };',
        '}',
        '',
        'export interface FeatureQueryExecutor {',
        '  query<T = unknown>(query: FeatureQuerySource, params: Record<string, unknown>): Promise<T[]>;',
        '}',
        '',
      ].join('\n'),
    },
    {
      relativePath: `${featureRoot}/_shared/loadSqlResource.ts`,
      kind: 'file',
      overwrite: false,
      contents: [
        "import { readFileSync } from 'node:fs';",
        "import path from 'node:path';",
        '',
        'export function loadSqlResource(currentDir: string, relativePath: string): string {',
        "  return readFileSync(path.join(currentDir, relativePath), 'utf8');",
        '}',
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
      } else if (!exists || mayOverwrite || file.overwrite !== false) {
        mkdirSync(path.dirname(destination), { recursive: true });
        writeFileSync(destination, file.contents ?? '', 'utf8');
      }
    }
    outputs.push({ path: file.relativePath, written: !dryRun, kind: file.kind });
  }

  return outputs;
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

function buildActionPlan(action: FeatureAction, table: DdlTable, primaryKeyColumn: string): {
  action: FeatureAction;
  params: DdlColumn[];
  rows: DdlColumn[];
  writeColumns: DdlColumn[];
} {
  const primaryKey = requireColumn(table, primaryKeyColumn);
  if (action === 'insert') {
    const writeColumns = table.columns.filter((column) => !isGeneratedInsertColumn(column, primaryKeyColumn) && column.defaultValue == null);
    return { action, params: writeColumns, rows: table.columns, writeColumns };
  }
  if (action === 'update') {
    const writeColumns = table.columns.filter((column) => column.name !== primaryKeyColumn && !isGeneratedInsertColumn(column, primaryKeyColumn));
    if (writeColumns.length === 0) {
      throw invalidCliInputError(
        'ASHIBA_FEATURE_UPDATE_REQUIRES_MUTABLE_COLUMN',
        `Update scaffold requires at least one mutable non-primary-key column: ${table.canonicalName}.`,
        'Add a mutable non-primary-key column to the DDL table or choose a different scaffold action.',
        { table: table.canonicalName },
      );
    }
    return { action, params: [primaryKey, ...writeColumns], rows: table.columns, writeColumns };
  }
  if (action === 'delete') {
    return { action, params: [primaryKey], rows: table.columns, writeColumns: [] };
  }
  if (action === 'get-by-id') {
    return { action, params: [primaryKey], rows: table.columns, writeColumns: [] };
  }
  const limitColumn: DdlColumn = {
    name: 'limit',
    typeName: 'integer',
    nullable: false,
    generated: false,
    primaryKey: false,
  };
  return { action, params: [limitColumn], rows: table.columns, writeColumns: [] };
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
    sql = [
      `update ${tableName}`,
      'set',
      plan.writeColumns.map((column) => `  ${quoteIdentifier(column.name)} = :${column.name}`).join(',\n'),
      'where',
      `  ${pk} = :${primaryKeyColumn}`,
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
    `export type { ${pascal}Request } from './input.js';`,
    `export type { ${pascal}Response } from './output.js';`,
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
  return [
    `import type { FeatureQueryExecutor } from '${FEATURE_SHARED_EXECUTOR_IMPORT_PATH}';`,
    `import type { ${pascal}Request } from './input.js';`,
    `import { execute${queryPascal}Query, type ${queryPascal}QueryParams, type ${queryPascal}QueryResult } from './queries/${queryName}/query.js';`,
    '',
    `export type ${pascal}WorkflowResult = ${plan.action === 'list' ? `${queryPascal}QueryResult[]` : `${queryPascal}QueryResult`};`,
    '',
    `export interface ${pascal}Queries {`,
    `  execute${queryPascal}: (`,
    '    executor: FeatureQueryExecutor,',
    `    params: ${queryPascal}QueryParams,`,
    `  ) => Promise<${plan.action === 'list' ? `${queryPascal}QueryResult[]` : `${queryPascal}QueryResult`}>;`,
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
  return [
    `import type { ${queryPascal}QueryResult } from './queries/${queryName}/query.js';`,
    '',
    ...renderFeatureResponseType(pascal, plan.action, fields),
    '',
    `export function buildResult(result: ${plan.action === 'list' ? `${queryPascal}QueryResult[]` : `${queryPascal}QueryResult`}): ${pascal}Response {`,
    ...renderFeatureBuildResultLines(plan.action, fields),
    '}',
    '',
  ].join('\n');
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
  if (action === 'list') {
    return [
      `export interface ${pascal}Response {`,
      '  items: Array<{',
      ...fields.map((field) => `    ${field.name}: ${field.typeScriptType};`),
      '  }>;',
      '}',
    ];
  }
  return [
    `export interface ${pascal}Response ${renderRenderFieldInterfaceBody(fields)}`,
  ];
}

function renderFeatureBuildResultLines(action: FeatureAction, fields: RenderField[]): string[] {
  if (action === 'list') {
    return [
      '  return {',
      '    items: result.map((item) => ({',
      ...fields.map((field) => `      ${field.name}: item.${field.sourceName},`),
      '    })),',
      '  };',
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
  const result = plan.action === 'list' ? `${pascal}QueryResult[]` : `${pascal}QueryResult`;
  const enablesOptionalConditionCompression = plan.action === 'list' || plan.action === 'get-by-id';
  const rowExpr = plan.action === 'list' ? 'rows as QueryRow[]' : '(rows[0] ?? null) as QueryRow | null';
  const returnLines = plan.action === 'list'
    ? ['  return row;']
    : [
        '  if (row === null) {',
        `    throw new Error('${queryName} query expected one row, but got 0.');`,
        '  }',
        '  return row;',
      ];
  return [
    "import { dirname } from 'node:path';",
    "import { fileURLToPath } from 'node:url';",
    '',
    `import type { FeatureQueryExecutor } from '${FEATURE_SHARED_EXECUTOR_IMPORT_PATH}';`,
    `import { loadSqlResource } from '${FEATURE_SHARED_LOAD_SQL_RESOURCE_IMPORT_PATH}';`,
    "import { queryModel } from './generated/query.meta.js';",
    '',
    'const currentDir = dirname(fileURLToPath(import.meta.url));',
    `export const ${camel}Sql = loadSqlResource(currentDir, '${queryName}.sql');`,
    `export const ${camel}Query = {`,
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
    '} as const;',
    '',
    `export interface ${pascal}QueryParams ${renderInterfaceBody(plan.params)}`,
    '',
    `export interface ${pascal}QueryResult ${renderInterfaceBody(plan.rows)}`,
    '',
    `type QueryRow = ${pascal}QueryResult;`,
    '',
    `export async function execute${pascal}Query(`,
    '  executor: FeatureQueryExecutor,',
    `  params: ${pascal}QueryParams`,
    `): Promise<${result}> {`,
    `  const rows = await executor.query<QueryRow>(${camel}Query, params as unknown as Record<string, unknown>);`,
    `  const row = ${rowExpr};`,
    ...returnLines,
    '}',
    '',
  ].join('\n');
}

function renderImportedQueryBoundary(
  queryName: string,
  parameters: string[],
  parameterTypes: Record<string, string>,
  resultColumnContracts: SqlResultColumnContract[],
): string {
  const pascal = toPascal(queryName);
  const camel = toCamel(queryName);
  const resultFields = toContractFields(resultColumnContracts, inferImportedResultNullabilityByColumn(resultColumnContracts));
  return [
    "import { dirname } from 'node:path';",
    "import { fileURLToPath } from 'node:url';",
    '',
    `import type { FeatureQueryExecutor } from '${FEATURE_SHARED_EXECUTOR_IMPORT_PATH}';`,
    `import { loadSqlResource } from '${FEATURE_SHARED_LOAD_SQL_RESOURCE_IMPORT_PATH}';`,
    "import { queryModel } from './generated/query.meta.js';",
    '',
    'const currentDir = dirname(fileURLToPath(import.meta.url));',
    `export const ${camel}Sql = loadSqlResource(currentDir, '${queryName}.sql');`,
    `export const ${camel}Query = {`,
    `  id: '${queryName}',`,
    `  path: '${queryName}.sql',`,
    `  sqlPath: '${queryName}.sql',`,
    `  sql: ${camel}Sql,`,
    '  queryModel,',
    ...(parameters.length > 0 ? ['  optionalConditionCompression: true,'] : []),
    '  metadata: {',
    `    sqlId: '${queryName}',`,
    `    queryId: '${queryName}',`,
    `    sqlFile: '${queryName}.sql',`,
    `    sqlPath: '${queryName}.sql',`,
    '  },',
    '} as const;',
    '',
    `export interface ${pascal}QueryParams ${renderImportedParamsInterface(parameters, parameterTypes)}`,
    '',
    `export interface ${pascal}QueryResult ${renderContractFieldInterfaceBody(resultFields)}`,
    '',
    `type QueryRow = ${pascal}QueryResult;`,
    '',
    `export async function execute${pascal}Query(`,
    '  executor: FeatureQueryExecutor,',
    `  params: ${pascal}QueryParams`,
    `): Promise<${pascal}QueryResult[]> {`,
    `  const rows = await executor.query<QueryRow>(${camel}Query, params as unknown as Record<string, unknown>);`,
    '  return rows;',
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

function renderImportedFeatureReadme(featureName: string, queryName: string): string {
  return [
    `# ${featureName}`,
    '',
    `Imported query: ${queryName}`,
    '',
    'This feature was scaffolded from an existing visible SQL file.',
    'Generated code is editable after import. Keep SQL visible, named, and directly runnable in a SQL client.',
    'Generated mapper cases prove that representative DB result values can map into the generated DTO shape.',
    'Human/AI-owned SQL logic cases belong under the query-local `tests/cases/` directory.',
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
    '  if (typeof raw !== \'object\' || raw === null || Array.isArray(raw)) {',
    "    throw new Error('Feature request must be an object.');",
    '  }',
    `  const record = raw as Partial<Record<keyof ${queryPascal}QueryParams, unknown>>;`,
    ...(parameters.length > 0
      ? [
          '  return {',
          ...parameters.map((parameter) => `    ${renderPropertyKey(parameter)}: record[${JSON.stringify(parameter)}] as ${parameterTypes[parameter] ?? 'unknown'},`),
          '  };',
        ]
      : ['  return {};']),
    '}',
    '',
  ].join('\n');
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
    `import type { ${queryPascal}QueryResult } from '../queries/${queryName}/query.js';`,
    '',
    `test('${featureName} executes imported ${queryName} query boundary through injected workflow', async () => {`,
    `  const request = ${renderTsExpression(request, 2)};`,
    `  const row: ${queryPascal}QueryResult = ${renderTsExpression(response.items[0], 2)};`,
    '  const executor: FeatureQueryExecutor = {',
    '    async query<T = unknown>() {',
    '      return [row] as T[];',
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

function buildFeatureQueryModel(sql: string, rootDir: string): {
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
    parameterTypes: ddlModel ? inferSqlParameterTypes(sql, ddlModel, schemaPath).parameterTypes : undefined,
  });
  return {
    analysis,
    bindings: {
      postgres: {
        sourceHash,
        ...postgres,
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
    const typeScriptType = nullabilityByColumn[column.name] === 'non-null'
      ? column.type
      : makeConservativeNullableType(column.type);
    return {
      name: column.name,
      typeScriptType,
      sqlType: sqlTypeForContract(inferSqlTypeForResultColumn(column) ?? sqlTypeForTypeScript(typeScriptType)),
      nullability: nullabilityByColumn[column.name] ?? 'unknown',
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
  return `sha256:${createHash('sha256').update(sql).digest('hex')}`;
}

function formatImportedSqlSafely(sql: string, rootDir: string): { sql: string; formatted: boolean; reason?: string } {
  const formatter = new SqlFormatter(resolveGeneratedSqlFormatOptions(rootDir, sql));
  let formattedSql: string;
  try {
    formattedSql = `${formatter.format(SqlParser.parse(sql)).formattedSql.trimEnd()};\n`;
  } catch (error) {
    throw astParseUserError({
      code: 'ASHIBA_FEATURE_IMPORT_SQL_AST_PARSE_FAILED',
      message: 'SQL AST parse failed while importing existing SQL.',
      reason: error instanceof Error ? error.message : String(error),
      sqlKind: 'SQL',
      operation: 'importing existing SQL into a feature query boundary',
    });
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
  if (!sameImportedTokenSequence(beforeTokens, afterTokens)) {
    return { safe: false, reason: `formatting skipped because token sequence changed: before=${beforeTokens.length}, after=${afterTokens.length}` };
  }
  const missingComments = missingImportedSqlCommentFragments(originalSql, formattedSql);
  if (missingComments.length > 0) {
    return { safe: false, reason: `formatting skipped because SQL comments would be dropped: ${missingComments.join(', ')}` };
  }
  try {
    const originalNormalized = formatter.format(SqlParser.parse(originalSql)).formattedSql.trim();
    const formattedNormalized = formatter.format(SqlParser.parse(formattedSql)).formattedSql.trim();
    if (originalNormalized !== formattedNormalized) {
      return { safe: false, reason: 'formatting skipped because formatted SQL did not round-trip to the same normalized AST output' };
    }
  } catch (error) {
    return { safe: false, reason: error instanceof Error ? error.message : String(error) };
  }
  return { safe: true };
}

function sameImportedTokenSequence(before: readonly Lexeme[], after: readonly Lexeme[]): boolean {
  if (before.length !== after.length) return false;
  return before.every((token, index) => {
    const other = after[index];
    return Boolean(other)
      && token.type === other.type
      && token.value === other.value
      && JSON.stringify(token.comments ?? null) === JSON.stringify(other.comments ?? null)
      && JSON.stringify(token.positionedComments ?? null) === JSON.stringify(other.positionedComments ?? null);
  });
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
  const request = renderTsExpression(
    Object.fromEntries(toFeatureFields(plan.params).map((field) => [field.name, sampleFieldValue(field)])),
    2,
  );
  const expectedParams = renderTsExpression(
    Object.fromEntries(toFeatureFields(plan.params).map((field) => [field.sourceName, sampleFieldValue(field)])),
    6,
  );
  const queryResult = plan.action === 'list'
    ? `[${renderTsValue(Object.fromEntries(toFeatureFields(plan.rows).map((field) => [field.sourceName, sampleFieldValue(field)])))}]`
    : `[${renderTsValue(Object.fromEntries(toFeatureFields(plan.rows).map((field) => [field.sourceName, sampleFieldValue(field)])))}]`;
  const queryResultRows = indentContinuation(`${queryResult} as unknown[]`, 6);
  const response = plan.action === 'list'
    ? renderTsExpression({ items: [Object.fromEntries(toFeatureFields(plan.rows).map((field) => [field.name, sampleFieldValue(field)]))] }, 2)
    : renderTsExpression(Object.fromEntries(toFeatureFields(plan.rows).map((field) => [field.name, sampleFieldValue(field)])), 2);
  return [
    "import { expect, test } from 'vitest';",
    '',
    "import { execute } from '../boundary.js';",
    `import type { FeatureQueryExecutor, FeatureQuerySource } from '${FEATURE_SHARED_EXECUTOR_IMPORT_PATH}';`,
    '',
    `test('${featureName} rejects invalid feature input before query execution', async () => {`,
    '  const guardedExecutor: FeatureQueryExecutor = {',
    '    async query() {',
    `      throw new Error('Feature boundary tests stay mock-based for ${featureName}; keep DB-backed SQL checks in the query boundary.');`,
    '    },',
    '  };',
    '',
    '  await expect(execute(guardedExecutor, {})).rejects.toThrow();',
    '});',
    '',
    `test('${featureName} maps request through workflow and output boundary', async () => {`,
    '  const executor: FeatureQueryExecutor = {',
    '    async query<T = unknown>(query: FeatureQuerySource, params: Record<string, unknown>): Promise<T[]> {',
    `      expect(query.id).toBe('${queryName}');`,
    `      expect(params).toEqual(${expectedParams});`,
    `      return ${queryResultRows} as T[];`,
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
    "import mappingCases from './generated/mapping.cases.js';",
    '',
    'const cases = [...mappingCases, ...logicCases];',
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
  const outputType = actionPlan.action === 'list' ? `${pascal}QueryResult[]` : `${pascal}QueryResult`;
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
    `export type ${pascal}QueryMappingZtdCase = QuerySpecZtdCase<`,
    `  ${pascal}BeforeDb,`,
    `  ${pascal}QueryParams,`,
    '  unknown',
    '>;',
    '',
  ].join('\n');
}

function renderGeneratedMappingZtdCases(
  queryName: string,
  actionPlan: ReturnType<typeof buildActionPlan>,
  table: DdlTable,
  primaryKeyColumn: string
): string {
  const pascal = toPascal(queryName);
  const caseType = `${pascal}QueryMappingZtdCase`;
  const cases = buildGeneratedMappingZtdCases(queryName, actionPlan, table, primaryKeyColumn);
  return [
    `import type { ${caseType} } from '../boundary-ztd-types.js';`,
    '',
    '// Library-owned mechanical mapper probes. Refresh with `ashiba feature tests scaffold` or `ashiba feature tests check --fix`.',
    '// These cases use synthetic DB result SQL to prove DTO mapping, not the source SQL business logic.',
    `const cases: readonly ${caseType}[] = ${renderTsValue(cases)};`,
    '',
    'export default cases;',
    '',
  ].join('\n');
}

function renderEmptyLogicZtdCases(queryName: string): string {
  const caseType = `${toPascal(queryName)}QueryBoundaryZtdCase`;
  return [
    `import type { ${caseType} } from '../boundary-ztd-types.js';`,
    '',
    '// Human/AI-owned SQL logic cases. Add business expectations here; Ashiba will not overwrite this file.',
    `const cases: readonly ${caseType}[] = [];`,
    '',
    'export default cases;',
    '',
  ].join('\n');
}

function renderGeneratedTestPlan(featureName: string, queryName: string): string {
  return [
    `# ${featureName}/${queryName} Test Plan`,
    '',
    'This generated file is library-owned and may be refreshed by Ashiba.',
    '',
    '- Unit tests are mapping-contract tests, not database state management or SQL logic tests.',
    '- Generated mapper cases use lightweight synthetic DB result SQL, usually a SELECT without a FROM clause, to prove DB-to-TypeScript DTO mapping.',
    '- Generated mapper cases do not prove source SQL business logic, parameter business meaning, row cardinality, affected-row counts, business mutation targets, transaction isolation, locking, or final database state.',
    '- Ashiba does not infer or check single-row cardinality after scaffolding; row handling in `query.ts` is customer-owned code.',
    '- DTOs are customer-owned after scaffolding. Ashiba may report drift and expected column/type/nullability, but it should not silently rewrite customer-owned DTOs.',
    '- Nullability is conservative. If Ashiba cannot prove a value is non-null, generated contracts and diagnostics should prefer nullable output.',
    '- DDL is loaded from the configured DDL source directory; missing DDL should fail mapping verification instead of silently skipping it.',
    '- Human/AI-owned SQL logic cases under `cases/` may use ZTD/CTE shadowing and the real source SQL.',
    '- Prefer Zero Table Dependency for mapping tests.',
    '- Performance tests: prefer traditional DB-backed tests.',
    '- Keep human-authored cases under `cases/`.',
    '',
  ].join('\n');
}

function renderGeneratedTestAnalysis(
  featureName: string,
  queryName: string,
  action: FeatureAction,
  table: DdlTable,
  primaryKeyColumn: string,
  actionPlan: ReturnType<typeof buildActionPlan>,
): string {
  return `${JSON.stringify({
    feature: featureName,
    query: queryName,
    action,
    table: table.canonicalName,
    primaryKeyColumn,
    mappingCaseSignature: buildMappingCaseSignature(queryName, actionPlan, table, primaryKeyColumn),
    status: 'generated',
  }, null, 2)}\n`;
}

function renderImportedQueryZtdTypes(
  queryName: string,
  table: DdlTable | undefined,
  fields: RenderContractField[],
): string {
  const pascal = toPascal(queryName);
  const beforeDb = table
    ? [
        `export type ${pascal}BeforeDb = {`,
        `  ${renderPropertyKey(table.schema)}: {`,
        `    ${renderPropertyKey(table.name)}: readonly {`,
        ...table.columns.map((column) => `      ${renderPropertyKey(column.name)}?: unknown;`),
        '    }[];',
        '  };',
        '};',
      ]
    : [
        `export type ${pascal}BeforeDb = Record<string, unknown>;`,
      ];
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
    `export type ${pascal}QueryMappingZtdCase = QuerySpecZtdCase<`,
    `  ${pascal}BeforeDb,`,
    `  ${pascal}QueryParams,`,
    '  unknown',
    '>;',
    '',
    fields.length === 0
      ? '// This imported SQL has no result columns in query metadata; add human-owned logic cases when behavior must be proved.'
      : '// Result columns are mapped through synthetic DB result probes so mapper tests stay focused on DTO compatibility.',
    '',
  ].join('\n');
}

function renderImportedGeneratedMappingZtdCases(queryName: string, cases: unknown[]): string {
  const pascal = toPascal(queryName);
  const caseType = `${pascal}QueryMappingZtdCase`;
  return [
    `import type { ${caseType} } from '../boundary-ztd-types.js';`,
    '',
    '// Library-owned mechanical mapper probes for imported SQL. Refresh with `ashiba feature tests check --fix` after SQL contract changes.',
    '// These cases cover DB/TypeScript DTO mapping with synthetic result SQL, not source SQL business behavior.',
    `const cases: readonly ${caseType}[] = ${renderTsValue(cases)};`,
    '',
    'export default cases;',
    '',
  ].join('\n');
}

function buildImportedMappingZtdCases(
  queryName: string,
  table: DdlTable | undefined,
  primaryKeyColumn: string | undefined,
  parameters: string[],
  parameterTypes: Record<string, string>,
  fields: RenderContractField[],
): unknown[] {
  if (fields.length === 0) {
    return [];
  }
  const firstRow = table ? buildFixtureRow(table, 1) : {};
  const input = buildImportedCaseInput(parameters, parameterTypes, table, firstRow, primaryKeyColumn);
  const expectedRow = buildSyntheticContractRow(table, fields, 'sample');
  const nullableRow = buildSyntheticContractRow(table, fields, 'nullable');
  const cases: unknown[] = [{
    name: `db-type-mapping: maps ${queryName} imported result columns into the DTO`,
    beforeDb: buildImportedBeforeDb(table),
    input,
    mapperProbe: {
      sql: buildSyntheticMapperProbeSql(fields, table, 'sample'),
    },
    output: [expectedRow],
  }];
  if (Object.values(nullableRow).some((value) => value === null)) {
    cases.push({
      name: `nullable-output-mapping: maps ${queryName} nullable imported result columns into the DTO`,
      beforeDb: buildImportedBeforeDb(table),
      input,
      mapperProbe: {
        sql: buildSyntheticMapperProbeSql(fields, table, 'nullable'),
      },
      output: [nullableRow],
    });
  }
  return cases;
}

function buildEmptyBeforeDb(table: DdlTable): Record<string, unknown> {
  return { [table.schema]: { [table.name]: [] } };
}

function buildImportedBeforeDb(table: DdlTable | undefined): Record<string, unknown> {
  return table ? buildEmptyBeforeDb(table) : {};
}

function buildSyntheticContractRow(
  table: DdlTable | undefined,
  fields: RenderContractField[],
  mode: 'sample' | 'nullable' | 'boundary' | 'negative-boundary',
): Record<string, unknown> {
  return Object.fromEntries(fields.map((field) => {
    const column = findDdlColumnForField(table, field.name);
    if (mode === 'nullable' && field.nullability === 'nullable') return [field.name, null];
    if (column) return [field.name, coerceSampleToContractType(sampleColumnValueByMode(column, mode), field.typeScriptType)];
    return [field.name, sampleValueForType(field.typeScriptType)];
  }));
}

function buildSyntheticMapperProbeSql(
  fields: RenderContractField[],
  table: DdlTable | undefined,
  mode: 'sample' | 'nullable' | 'boundary' | 'negative-boundary',
): string {
  return [
    'select',
    fields.map((field, index) => {
      const prefix = index === 0 ? '    ' : '    , ';
      const column = findDdlColumnForField(table, field.name);
      const sqlType = column ? sqlTypeForDdlColumn(column) : field.sqlType;
      const valueSql = mode === 'nullable' && field.nullability === 'nullable'
        ? 'null'
        : sqlLiteral(buildSyntheticContractRow(table, [field], mode)[field.name]);
      return `${prefix}cast(${valueSql} as ${sqlType}) as ${quoteIdentifier(field.name)}`;
    }).join('\n'),
    ';',
  ].join('\n');
}

function findDdlColumnForField(table: DdlTable | undefined, fieldName: string): DdlColumn | undefined {
  return table?.columns.find((column) => column.name.toLowerCase() === fieldName.toLowerCase());
}

function isNullableType(typeScriptType: string): boolean {
  return /\bnull\b/.test(typeScriptType);
}

function sqlTypeForTypeScript(typeScriptType: string): string {
  const normalized = typeScriptType.replace(/\s*\|\s*null/g, '').trim();
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

function sqlTypeForDdlColumn(column: DdlColumn): string {
  const type = column.typeName.toLowerCase();
  if (/^(smallserial|serial2)$/.test(type)) return 'smallint';
  if (/^(serial|serial4)$/.test(type)) return 'integer';
  if (/^(bigserial|serial8)$/.test(type)) return 'bigint';
  return column.typeName;
}

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '0';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sampleColumnValueByMode(column: DdlColumn, mode: 'sample' | 'nullable' | 'boundary' | 'negative-boundary'): unknown {
  if (mode === 'boundary') return sampleBoundaryColumnValue(column);
  if (mode === 'negative-boundary') return sampleNegativeBoundaryColumnValue(column);
  return sampleColumnValue(column, 1);
}

function coerceSampleToContractType(value: unknown, typeScriptType: string): unknown {
  const normalized = typeScriptType.replace(/\s*\|\s*null/g, '').trim();
  if (value === null || value === undefined) return value;
  if (normalized === 'number' && typeof value === 'string' && value.trim() !== '') {
    const next = Number(value);
    return Number.isFinite(next) ? next : value;
  }
  if (normalized === 'string' && typeof value !== 'string') {
    return String(value);
  }
  if (normalized === 'boolean' && typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return value;
}

function buildImportedCaseInput(
  parameters: string[],
  parameterTypes: Record<string, string>,
  table: DdlTable | undefined,
  firstRow: Record<string, unknown>,
  primaryKeyColumn: string | undefined,
): Record<string, unknown> {
  const columnMap = new Map((table?.columns ?? []).map((column) => [column.name.toLowerCase(), column]));
  return Object.fromEntries(parameters.map((parameter) => {
    const column = columnMap.get(parameter.toLowerCase());
    if (column) return [parameter, firstRow[column.name]];
    if (primaryKeyColumn && parameter.toLowerCase() === primaryKeyColumn.toLowerCase()) return [parameter, firstRow[primaryKeyColumn]];
    if (parameter.toLowerCase() === 'limit') return [parameter, 100];
    if (parameter.toLowerCase() === 'offset') return [parameter, 0];
    return [parameter, sampleValueForType(parameterTypes[parameter] ?? 'unknown')];
  }));
}

function isPaginationParameter(name: string): boolean {
  const normalized = name.toLowerCase();
  return normalized === 'limit' || normalized === 'offset';
}

function buildGeneratedMappingZtdCases(
  queryName: string,
  actionPlan: ReturnType<typeof buildActionPlan>,
  table: DdlTable,
  primaryKeyColumn: string
): unknown[] {
  if (actionPlan.rows.length === 0) return [];
  const fields = toDdlContractFields(actionPlan.rows);
  const cases: unknown[] = [
    buildGeneratedMapperProbeCase('db-type-mapping', queryName, actionPlan, table, primaryKeyColumn, fields, 'sample'),
  ];
  if (actionPlan.rows.some((column) => column.nullable)) {
    cases.push(buildGeneratedMapperProbeCase('nullable-output-mapping', queryName, actionPlan, table, primaryKeyColumn, fields, 'nullable'));
  }
  if (actionPlan.rows.some((column) => isBoundaryValueColumn(column))) {
    cases.push(buildGeneratedMapperProbeCase('boundary-value-mapping', queryName, actionPlan, table, primaryKeyColumn, fields, 'boundary'));
    cases.push(buildGeneratedMapperProbeCase('negative-boundary-value-mapping', queryName, actionPlan, table, primaryKeyColumn, fields, 'negative-boundary'));
  }
  return cases;
}

function buildGeneratedMapperProbeCase(
  kind: string,
  queryName: string,
  actionPlan: ReturnType<typeof buildActionPlan>,
  table: DdlTable,
  primaryKeyColumn: string,
  fields: RenderContractField[],
  mode: 'sample' | 'nullable' | 'boundary' | 'negative-boundary',
): unknown {
  const row = buildSyntheticContractRow(table, fields, mode);
  return {
    name: `${kind}: maps ${queryName} DB result values into the DTO`,
    beforeDb: buildEmptyBeforeDb(table),
    input: buildGeneratedMapperProbeInput(actionPlan, primaryKeyColumn),
    mapperProbe: {
      sql: buildSyntheticMapperProbeSql(fields, table, mode),
    },
    output: actionPlan.action === 'list' ? [row] : row,
  };
}

function buildGeneratedMapperProbeInput(
  actionPlan: ReturnType<typeof buildActionPlan>,
  _primaryKeyColumn: string,
): Record<string, unknown> {
  return Object.fromEntries(actionPlan.params.map((column) => [column.name, sampleParameterValue(column)]));
}

function toDdlContractFields(columns: DdlColumn[]): RenderContractField[] {
  return columns.map((column) => ({
    name: column.name,
    typeScriptType: toTsType(column),
    sqlType: sqlTypeForDdlColumn(column),
    nullability: column.nullable ? 'nullable' : 'non-null',
  }));
}

function buildFixtureRow(table: DdlTable, rowNumber: number): Record<string, unknown> {
  return Object.fromEntries(table.columns.map((column) => [column.name, sampleColumnValue(column, rowNumber)]));
}

function sampleParameterValue(column: DdlColumn): unknown {
  if (column.name === 'limit') return 100;
  return sampleColumnValue(column, 1);
}

function sampleValueForType(typeScriptType: string): unknown {
  const normalized = typeScriptType.replace(/\s*\|\s*null/g, '').trim();
  if (normalized === 'null') return null;
  if (normalized === 'number') return 1;
  if (normalized === 'boolean') return true;
  if (normalized === 'string') return 'value';
  if (normalized === 'unknown') return 'value';
  return 'value';
}

function sampleColumnValue(column: DdlColumn, rowNumber: number): unknown {
  const type = column.typeName.toLowerCase();
  const name = column.name.toLowerCase();
  if (/^(timestamp|timestamp without time zone|timestamp with time zone|timestamptz)$/.test(type)) {
    return `2026-01-0${rowNumber}T00:00:00.000Z`;
  }
  if (/^(smallint|integer|int|int2|int4|real|float|float4|float8|double precision|serial|serial2|serial4)$/.test(type)) {
    return rowNumber;
  }
  if (/^(bigint|int8|bigserial|serial8|numeric|decimal)$/.test(type)) {
    return String(rowNumber);
  }
  if (/^(boolean|bool)$/.test(type)) {
    return rowNumber % 2 === 1;
  }
  if (name.includes('email')) {
    return rowNumber === 1 ? 'alice@example.com' : 'bob@example.com';
  }
  if (name.includes('name')) {
    return rowNumber === 1 ? 'Alice' : 'Bob';
  }
  if (name.includes('status')) {
    return rowNumber === 1 ? 'active' : 'inactive';
  }
  return `${column.name}-${rowNumber}`;
}

function sampleBoundaryColumnValue(column: DdlColumn): unknown {
  const type = column.typeName.toLowerCase();
  const name = column.name.toLowerCase();
  if (/^(smallint|int2)$/.test(type)) return 32767;
  if (/^(integer|int|int4|serial|serial4)$/.test(type)) return 2147483647;
  if (/^(bigint|int8|bigserial|serial8)$/.test(type)) return '9223372036854775807';
  if (/^(real|float|float4|float8|double precision)$/.test(type)) return 123456.5;
  if (/^(numeric|decimal)$/.test(type)) return '1234567890.12345';
  if (/^(boolean|bool)$/.test(type)) return true;
  if (name.includes('email')) return 'boundary@example.com';
  return `${column.name}-boundary-value`;
}

function sampleNegativeBoundaryColumnValue(column: DdlColumn): unknown {
  const type = column.typeName.toLowerCase();
  const name = column.name.toLowerCase();
  if (/^(smallint|int2)$/.test(type)) return -32768;
  if (/^(integer|int|int4|serial|serial4)$/.test(type)) return -2147483648;
  if (/^(bigint|int8|bigserial|serial8)$/.test(type)) return '-9223372036854775808';
  if (/^(real|float|float4|float8|double precision)$/.test(type)) return -123456.5;
  if (/^(numeric|decimal)$/.test(type)) return '-1234567890.12345';
  if (/^(boolean|bool)$/.test(type)) return false;
  if (name.includes('email')) return 'negative-boundary@example.com';
  return `${column.name}-negative-boundary-value`;
}

function isBoundaryValueColumn(column: DdlColumn): boolean {
  return /^(smallint|integer|int|int2|int4|bigint|int8|bigserial|serial8|real|float|float4|float8|double precision|numeric|decimal)$/
    .test(column.typeName.toLowerCase());
}

function buildMappingCaseSignature(
  queryName: string,
  actionPlan: ReturnType<typeof buildActionPlan>,
  table: DdlTable,
  primaryKeyColumn: string,
): Record<string, unknown> {
  return {
    query: queryName,
    action: actionPlan.action,
    table: table.canonicalName,
    primaryKeyColumn,
    params: actionPlan.params.map((column) => columnSignature(column)),
    rows: actionPlan.rows.map((column) => columnSignature(column)),
    writeColumns: actionPlan.writeColumns.map((column) => columnSignature(column)),
    generatedCaseNames: buildGeneratedMappingZtdCases(queryName, actionPlan, table, primaryKeyColumn)
      .map((entry) => hasStringName(entry) ? entry.name : 'unknown'),
  };
}

function hasStringName(value: unknown): value is { name: string } {
  return typeof value === 'object' && value !== null && 'name' in value && typeof value.name === 'string';
}

function columnSignature(column: DdlColumn): Record<string, unknown> {
  return {
    name: column.name,
    typeName: column.typeName,
    nullable: column.nullable,
    defaultValue: column.defaultValue ?? null,
    generated: column.generated,
    primaryKey: column.primaryKey,
  };
}

function renderTsValue(value: unknown): string {
  return JSON.stringify(value, null, 2)
    .replace(/\n/g, '\n')
    .replace(/"([^"]+)":/g, (_match, key: string) => `${renderPropertyKey(key)}:`);
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
    'Transaction policy and feature orchestration belong to application code, not Ashiba.',
    '',
  ].join('\n');
}

function formatFeatureScaffoldResult(label: string, result: FeatureScaffoldResult): string {
  return formatFilePlan(`${label} ${result.dryRun ? 'plan' : 'completed'}: ${result.featureName}`, process.cwd(), result.dryRun, result.outputs);
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
  return `${[
    ...lines,
    '',
    ...result.outputs.map((output) => `- ${output.written ? 'write' : 'plan'} ${output.kind}: ${output.path}`),
  ].join('\n')}\n`;
}

function formatFeatureQueryMetadataRefresh(result: FeatureQueryMetadataRefreshResult): string {
  return [
    `Feature query refresh ${result.dryRun ? 'plan' : 'completed'}: ${result.featureName}/${result.queryName}`,
    '',
    `- sql: ${result.sqlFile}`,
    `- query: ${result.queryFile}`,
    `- metadata: ${result.metadataFile}`,
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
  if (options.feature) return path.join(rootDir, 'src', 'features', normalizeFeatureName(options.feature));
  if (options.boundaryDir) return path.resolve(rootDir, options.boundaryDir);
  return options.workingDir ? path.resolve(options.workingDir) : process.cwd();
}

function resolveExplicitFeatureBoundaryDir(rootDir: string, feature: string | undefined, boundaryDir: string | undefined, commandLabel: string): string {
  if (feature && boundaryDir) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_BOUNDARY_INPUT_CONFLICT',
      'Use either a feature name or --boundary-dir, not both.',
      'Choose one boundary selector and rerun the command.',
      { options: ['<feature>', '--boundary-dir'] },
    );
  }
  if (boundaryDir) return path.resolve(rootDir, boundaryDir);
  if (feature) return path.join(rootDir, 'src', 'features', normalizeFeatureName(feature));
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
  const base = /^(smallint|integer|int|int2|int4|real|float|float4|float8|double precision|serial|serial2|serial4)$/.test(type)
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
