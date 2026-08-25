import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import type { Command } from 'commander';
import { compileNamedParameters } from '@ashiba-ts/named-parameters/compiler';
import { normalizeSqlSource } from '../sql-source.js';
import { buildQueryResultColumnContracts } from './model-gen.js';
import { extractSqlResultColumnAstItems } from './sql-result-columns.js';
import { areTypeScriptTypesCompatible } from './sql-parameter-types.js';
import {
  derivePostgresQueryContractFromDatabase,
  parsePostgresDerivedQueryContract,
  type PostgresDerivedQueryContract,
  type PostgresDriverProfile,
} from './postgres-contract.js';

export type StandalonePostgresContractOptions = {
  sqlFile: string;
  out?: string;
  contract?: string;
  databaseUrl?: string;
  databaseUrlEnv?: string;
  driverProfile?: string;
  resultTypeFile?: string;
  resultType?: string;
  paramsTypeFile?: string;
  paramsType?: string;
  rootDir?: string;
};

export async function writeStandalonePostgresContract(options: StandalonePostgresContractOptions): Promise<{
  sqlFile: string; contractFile: string; contract: PostgresDerivedQueryContract;
}> {
  const rootDir = path.resolve(options.rootDir ?? '.');
  const sqlPath = path.resolve(rootDir, options.sqlFile);
  const sql = normalizeSqlSource(readFileSync(sqlPath, 'utf8'));
  const binding = compileNamedParameters(sql, { placeholderStyle: 'postgres' });
  const resultColumns = buildQueryResultColumnContracts(sql, rootDir);
  const resultColumnOrder = extractSqlResultColumnAstItems(sql).map((column) => column.name);
  const contract = await derivePostgresQueryContractFromDatabase(resolveDatabaseUrl(options), {
    sql,
    compiledSql: binding.sql,
    parameterNames: binding.orderedNames,
    resultColumnOrder,
    resultColumnNullability: Object.fromEntries(resultColumns.map((column) => [column.name, column.nullability])),
    driverProfile: parseDriverProfile(options.driverProfile),
  });
  const contractPath = path.resolve(rootDir, options.out ?? `${options.sqlFile}.postgres.contract.json`);
  mkdirSync(path.dirname(contractPath), { recursive: true });
  writeFileSync(contractPath, `${JSON.stringify(contract, null, 2)}\n`, 'utf8');
  return { sqlFile: relative(rootDir, sqlPath), contractFile: relative(rootDir, contractPath), contract };
}

export function checkStandalonePostgresContract(options: StandalonePostgresContractOptions): { ok: boolean; issues: string[] } {
  const rootDir = path.resolve(options.rootDir ?? '.');
  const sqlPath = path.resolve(rootDir, options.sqlFile);
  const contractPath = path.resolve(rootDir, options.contract ?? `${options.sqlFile}.postgres.contract.json`);
  if (!existsSync(contractPath)) return { ok: false, issues: [`Contract not found: ${relative(rootDir, contractPath)}.`] };
  const contract = parsePostgresDerivedQueryContract(JSON.parse(readFileSync(contractPath, 'utf8')));
  const sourceHash = sourceHashOf(normalizeSqlSource(readFileSync(sqlPath, 'utf8')));
  const issues = contract.sourceHash === sourceHash ? [] : ['PostgreSQL contract is stale; rerun postgres-contract write.'];
  checkParameterTypes(contract, options, rootDir, issues);
  const hasResults = contract.driver.results.length > 0;
  if (!hasResults && (options.resultTypeFile || options.resultType)) {
    throw new Error('This contract has no result fields; omit --result-type-file and --result-type.');
  }
  if (hasResults && (!options.resultTypeFile || !options.resultType)) {
    throw new Error('Standalone PostgreSQL contract check requires --result-type-file and --result-type when SQL returns results.');
  }
  if (!hasResults) return { ok: issues.length === 0, issues };
  const resultTypeFile = options.resultTypeFile as string;
  const resultType = options.resultType as string;
  const types = readObjectType(readFileSync(path.resolve(rootDir, resultTypeFile), 'utf8'), resultType);
  for (const field of contract.driver.results) {
    if (!field.name) {
      issues.push(`result position ${field.position}: name is unresolved; cannot compare ${resultType}.`);
      continue;
    }
    if (field.typeScriptType === 'unknown') {
      issues.push(`${field.name}: node-postgres representation is unknown; cannot compare ${resultType}.`);
      continue;
    }
    if (!(field.name in types)) { issues.push(`${field.name}: missing from ${resultType}.`); continue; }
    if (!sameType(types[field.name] ?? '', field.typeScriptType)) {
      issues.push(`${field.name}: TypeScript ${types[field.name]} / node-postgres ${field.typeScriptType}.`);
    }
  }
  for (const field of Object.keys(types).filter((name) => !contract.driver.results.some((result) => result.name === name))) {
    issues.push(`${field}: extra field in ${resultType}; absent from PostgreSQL results.`);
  }
  return { ok: issues.length === 0, issues };
}

export function registerStandalonePostgresContractCommand(program: Command): void {
  const command = program.command('postgres-contract').description('Derive and check a PostgreSQL contract for standalone canonical SQL');
  command.command('write <sqlFile>')
    .option('--database-url <url>', 'Development/test PostgreSQL URL')
    .option('--database-url-env <name>', 'URL environment variable', 'ASHIBA_POSTGRES_DATABASE_URL')
    .option('--out <file>', 'Contract output path')
    .option('--driver-profile <profile>', 'node-postgres-default or custom:<stable-id>')
    .option('--root-dir <path>', 'Project root directory', '.')
    .action(async (sqlFile, options) => {
      const result = await writeStandalonePostgresContract({ ...options, sqlFile });
      process.stdout.write(`${JSON.stringify({ kind: 'standalone-postgres-contract', ...result }, null, 2)}\n`);
    });
  command.command('check <sqlFile>')
    .option('--contract <file>', 'Contract input path')
    .option('--result-type-file <file>', 'TypeScript file containing the row type; required when SQL returns results')
    .option('--result-type <name>', 'Exported interface or object type alias to compare; required when SQL returns results')
    .option('--params-type-file <file>', 'TypeScript file containing parameter type; required when SQL has named parameters')
    .option('--params-type <name>', 'Exported interface or object type alias to compare; required when SQL has named parameters')
    .option('--root-dir <path>', 'Project root directory', '.')
    .action((sqlFile, options) => {
      const result = checkStandalonePostgresContract({ ...options, sqlFile });
      process.stdout.write(`${JSON.stringify({ kind: 'standalone-postgres-contract-check', ...result }, null, 2)}\n`);
      if (!result.ok) process.exitCode = 1;
    });
}

function resolveDatabaseUrl(options: StandalonePostgresContractOptions): string {
  const url = options.databaseUrl ?? process.env[options.databaseUrlEnv ?? 'ASHIBA_POSTGRES_DATABASE_URL'];
  if (!url) throw new Error('PostgreSQL contract requires --database-url or ASHIBA_POSTGRES_DATABASE_URL.');
  return url;
}

function parseDriverProfile(value: string | undefined): PostgresDriverProfile {
  const profile = value ?? 'node-postgres-default';
  if (profile === 'node-postgres-default' || /^custom:.+/.test(profile)) return profile as PostgresDriverProfile;
  throw new Error('Use node-postgres-default or custom:<stable-id>.');
}

function readObjectType(source: string, name: string): Record<string, string> {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`export\\s+(?:interface\\s+${escaped}|type\\s+${escaped}\\s*=)\\s*\\{([\\s\\S]*?)\\}`));
  if (!match) throw new Error(`Exported object type ${name} was not found.`);
  const entries = (match[1] ?? '').split(';').map((entry) => entry.trim()).filter(Boolean);
  const fields = entries.map((entry) => {
    const field = entry.match(/^([A-Za-z_][A-Za-z0-9_]*)\??\s*:\s*([\s\S]+)$/);
    if (!field) throw new Error(`Unsupported syntax in ${name}; use a flat exported interface or object type literal with semicolon-terminated fields.`);
    return [field[1] ?? '', field[2]?.trim() ?? ''] as const;
  });
  if (new Set(fields.map(([field]) => field)).size !== fields.length) throw new Error(`Duplicate field in ${name}.`);
  return Object.fromEntries(fields);
}

function checkParameterTypes(
  contract: PostgresDerivedQueryContract,
  options: StandalonePostgresContractOptions,
  rootDir: string,
  issues: string[],
): void {
  const parameters = contract.driver.parameters;
  if (parameters.length === 0) {
    if (options.paramsTypeFile || options.paramsType) throw new Error('This contract has no parameters; omit --params-type-file and --params-type.');
    return;
  }
  if (!options.paramsTypeFile || !options.paramsType) {
    throw new Error('Standalone PostgreSQL contract check requires --params-type-file and --params-type when SQL has named parameters.');
  }
  const paramsType = options.paramsType;
  const types = readObjectType(readFileSync(path.resolve(rootDir, options.paramsTypeFile), 'utf8'), paramsType);
  const contractNames = new Set<string>();
  for (const field of parameters) {
    if (!field.name) {
      issues.push(`parameter position ${field.position}: name is unresolved; cannot compare ${paramsType}.`);
      continue;
    }
    contractNames.add(field.name);
    if (field.typeScriptType === 'unknown') {
      issues.push(`${field.name}: node-postgres input representation is unknown; cannot compare ${paramsType}.`);
      continue;
    }
    if (!(field.name in types)) { issues.push(`${field.name}: missing from ${paramsType}.`); continue; }
    if (!areTypeScriptTypesCompatible(types[field.name] ?? 'unknown', field.typeScriptType)) {
      issues.push(`${field.name}: TypeScript ${types[field.name]} / node-postgres input ${field.typeScriptType}.`);
    }
  }
  for (const field of Object.keys(types).filter((name) => !contractNames.has(name))) {
    issues.push(`${field}: extra field in ${paramsType}; absent from PostgreSQL parameters.`);
  }
}

function sameType(left: string, right: string): boolean { return left.replace(/\s+/g, ' ').trim() === right.replace(/\s+/g, ' ').trim(); }
function relative(root: string, value: string): string { return path.relative(root, value).replaceAll('\\', '/'); }
function sourceHashOf(sql: string): string { return `sha256:${createHash('sha256').update(sql).digest('hex')}`; }
