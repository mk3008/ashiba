import { createHash, randomUUID } from 'node:crypto';
import pg from 'pg';
import { normalizeSqlSource } from '../sql-source.js';

export type QueryContractProvenance = 'proven' | 'inferred' | 'driver-mapped' | 'unknown';
export type PostgresDriverProfile = 'node-postgres-default' | `custom:${string}`;
export type PostgresDatabaseTypeKind =
  | 'base'
  | 'array'
  | 'enum'
  | 'domain'
  | 'composite'
  | 'range'
  | 'multirange'
  | 'pseudo'
  | 'unknown';

export interface PostgresDatabaseTypeIdentity {
  oid: number;
  schema: string;
  name: string;
  formattedName: string;
  kind: PostgresDatabaseTypeKind;
  category: string;
  elementTypeOid?: number;
  baseTypeOid?: number;
  enumValues?: string[];
}

export interface PostgresContractNullability {
  value: 'non-null' | 'nullable' | 'unknown';
  provenance: 'inferred' | 'unknown';
}

export interface PostgresContractField {
  position: number;
  name?: string;
  databaseType: PostgresDatabaseTypeIdentity;
  typeProvenance: 'proven';
  nullability: PostgresContractNullability;
}

export interface PostgresContractResult extends PostgresContractField {
  nameProvenance: 'inferred' | 'unknown';
}

export interface PostgresDriverRepresentation {
  position: number;
  name?: string;
  runtimeType: 'number' | 'string' | 'boolean' | 'Date' | 'array' | 'json-value' | 'unknown';
  typeScriptType: string;
  provenance: 'driver-mapped' | 'unknown';
}

export interface PostgresDerivedQueryContract {
  version: 1;
  sourceHash: string;
  database: {
    system: 'postgresql';
    serverMajor: number;
    parameters: PostgresContractField[];
    results: PostgresContractResult[];
  };
  driver: {
    profile: PostgresDriverProfile;
    parameters: PostgresDriverRepresentation[];
    results: PostgresDriverRepresentation[];
  };
  diagnostics: Array<{ code: string; message: string }>;
}

export interface DerivePostgresQueryContractOptions {
  sql: string;
  compiledSql: string;
  parameterNames: readonly string[];
  resultColumnOrder: readonly string[];
  resultColumnNullability: Readonly<Record<string, 'non-null' | 'nullable' | 'unknown'>>;
  driverProfile?: PostgresDriverProfile;
}

export interface PostgresContractQueryable {
  query(sql: string, values?: readonly unknown[]): Promise<{ rows: unknown[] }>;
}

type PositionedOid = { position: number; oid: number };

/** Validates a generated JSON contract before it can re-enter query metadata. */
export function parsePostgresDerivedQueryContract(value: unknown): PostgresDerivedQueryContract {
  const record = requireRecord(value, 'PostgreSQL contract');
  const version = requireNumber(record.version, 'PostgreSQL contract.version');
  if (version !== 1) throw new Error(`Unsupported PostgreSQL contract version: ${version}.`);
  const database = requireRecord(record.database, 'PostgreSQL contract.database');
  if (requireString(database.system, 'PostgreSQL contract.database.system') !== 'postgresql') {
    throw new Error('PostgreSQL contract.database.system must be postgresql.');
  }
  const driver = requireRecord(record.driver, 'PostgreSQL contract.driver');
  const profile = normalizeDriverProfile(requireString(driver.profile, 'PostgreSQL contract.driver.profile'));
  return {
    version: 1,
    sourceHash: requireString(record.sourceHash, 'PostgreSQL contract.sourceHash'),
    database: {
      system: 'postgresql',
      serverMajor: requireNumber(database.serverMajor, 'PostgreSQL contract.database.serverMajor'),
      parameters: requireArray(database.parameters, 'PostgreSQL contract.database.parameters').map((field, index) =>
        parseContractField(field, `PostgreSQL contract.database.parameters[${index}]`)),
      results: requireArray(database.results, 'PostgreSQL contract.database.results').map((field, index) =>
        parseContractResult(field, `PostgreSQL contract.database.results[${index}]`)),
    },
    driver: {
      profile,
      parameters: requireArray(driver.parameters, 'PostgreSQL contract.driver.parameters').map((field, index) =>
        parseDriverRepresentation(field, `PostgreSQL contract.driver.parameters[${index}]`)),
      results: requireArray(driver.results, 'PostgreSQL contract.driver.results').map((field, index) =>
        parseDriverRepresentation(field, `PostgreSQL contract.driver.results[${index}]`)),
    },
    diagnostics: requireArray(record.diagnostics, 'PostgreSQL contract.diagnostics').map((diagnostic, index) => {
      const item = requireRecord(diagnostic, `PostgreSQL contract.diagnostics[${index}]`);
      return {
        code: requireString(item.code, `PostgreSQL contract.diagnostics[${index}].code`),
        message: requireString(item.message, `PostgreSQL contract.diagnostics[${index}].message`),
      };
    }),
  };
}

/**
 * Connects to a development PostgreSQL database and derives a query contract.
 * The canonical statement is prepared and described through catalog metadata;
 * it is never executed by this function.
 */
export async function derivePostgresQueryContractFromDatabase(
  connectionString: string,
  options: DerivePostgresQueryContractOptions,
): Promise<PostgresDerivedQueryContract> {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    return await derivePostgresQueryContract({
      query: async (sql, values = []) => {
        const result = await client.query(sql, [...values]);
        return { rows: result.rows };
      },
    }, options);
  } finally {
    await client.end();
  }
}

/**
 * Derives PostgreSQL parameter/result OIDs without executing the application
 * statement. Runtime value types are a separate node-postgres profile mapping.
 */
export async function derivePostgresQueryContract(
  client: PostgresContractQueryable,
  options: DerivePostgresQueryContractOptions,
): Promise<PostgresDerivedQueryContract> {
  const sql = normalizeSqlSource(options.sql);
  const sourceHash = hashSql(sql);
  const statementName = `ashiba_contract_${sourceHash.slice(7, 19)}_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
  const preparedSql = stripTrailingSemicolon(normalizeSqlSource(options.compiledSql));
  let prepared = false;
  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '15s'");
    await client.query(`prepare ${quoteIdentifier(statementName)} as ${preparedSql}`);
    prepared = true;

    const parameterOids = await readPreparedOids(client, statementName, 'parameter_types');
    const resultOids = await readPreparedOids(client, statementName, 'result_types');
    const serverMajor = await readServerMajor(client);
    const allOids = [...new Set([...parameterOids, ...resultOids].map((entry) => entry.oid))].sort((left, right) => left - right);
    const typesByOid = await readDatabaseTypes(client, allOids);
    const diagnostics: Array<{ code: string; message: string }> = [];
    const hasExactResultNames = options.resultColumnOrder.length === resultOids.length;
    if (!hasExactResultNames && resultOids.length > 0) {
      diagnostics.push({
        code: 'ASHIBA_POSTGRES_RESULT_NAME_ORDER_UNRESOLVED',
        message: `PostgreSQL proved ${resultOids.length} result positions, but offline SQL analysis proved ${options.resultColumnOrder.length} names. Result types remain position-based and names are unknown.`,
      });
    }

    const parameters = parameterOids.map((entry) => buildParameterContract(
      entry,
      options.parameterNames[entry.position - 1],
      requireDatabaseType(typesByOid, entry.oid),
    ));
    const results = resultOids.map((entry) => {
      const name = hasExactResultNames ? options.resultColumnOrder[entry.position - 1] : undefined;
      return buildResultContract(
        entry,
        name,
        requireDatabaseType(typesByOid, entry.oid),
        name ? options.resultColumnNullability[name] : undefined,
      );
    });
    const profile = normalizeDriverProfile(options.driverProfile ?? 'node-postgres-default');
    return {
      version: 1,
      sourceHash,
      database: {
        system: 'postgresql',
        serverMajor,
        parameters,
        results,
      },
      driver: {
        profile,
        parameters: parameters.map((field) => mapDriverRepresentation(field, profile, typesByOid, 'parameter')),
        results: results.map((field) => mapDriverRepresentation(field, profile, typesByOid, 'result')),
      },
      diagnostics,
    };
  } finally {
    if (prepared) {
      try {
        await client.query(`deallocate ${quoteIdentifier(statementName)}`);
      } catch {
        // ROLLBACK below is still required; preserve the original failure.
      }
    }
    await client.query('rollback');
  }
}

function buildParameterContract(
  entry: PositionedOid,
  name: string | undefined,
  databaseType: PostgresDatabaseTypeIdentity,
): PostgresContractField {
  return {
    position: entry.position,
    ...(name ? { name } : {}),
    databaseType,
    typeProvenance: 'proven',
    nullability: { value: 'unknown', provenance: 'unknown' },
  };
}

function buildResultContract(
  entry: PositionedOid,
  name: string | undefined,
  databaseType: PostgresDatabaseTypeIdentity,
  nullability: 'non-null' | 'nullable' | 'unknown' | undefined,
): PostgresContractResult {
  const value = nullability ?? 'unknown';
  return {
    position: entry.position,
    ...(name ? { name } : {}),
    nameProvenance: name ? 'inferred' : 'unknown',
    databaseType,
    typeProvenance: 'proven',
    nullability: {
      value,
      provenance: value === 'unknown' ? 'unknown' : 'inferred',
    },
  };
}

async function readPreparedOids(
  client: PostgresContractQueryable,
  statementName: string,
  field: 'parameter_types' | 'result_types',
): Promise<PositionedOid[]> {
  const result = await client.query(
    [
      'select item.ordinality::integer as position, item.type_oid::integer as oid',
      'from pg_catalog.pg_prepared_statements prepared',
      `cross join lateral unnest(prepared.${field}::oid[]) with ordinality as item(type_oid, ordinality)`,
      'where prepared.name = $1',
      'order by item.ordinality',
    ].join('\n'),
    [statementName],
  );
  return result.rows.map((row, index) => {
    const record = requireRecord(row, `${field}[${index}]`);
    return {
      position: requireNumber(record.position, `${field}[${index}].position`),
      oid: requireNumber(record.oid, `${field}[${index}].oid`),
    };
  });
}

async function readServerMajor(client: PostgresContractQueryable): Promise<number> {
  const result = await client.query("select current_setting('server_version_num') as version_num");
  const record = requireRecord(result.rows[0], 'server version');
  const version = Number.parseInt(requireString(record.version_num, 'server version.version_num'), 10);
  if (!Number.isSafeInteger(version) || version <= 0) {
    throw new Error('PostgreSQL returned an invalid server_version_num.');
  }
  return Math.floor(version / 10_000);
}

async function readDatabaseTypes(
  client: PostgresContractQueryable,
  requestedOids: readonly number[],
): Promise<Map<number, PostgresDatabaseTypeIdentity>> {
  if (requestedOids.length === 0) return new Map();
  const result = await client.query(
    [
      'with recursive expanded(oid) as (',
      '  select unnest($1::oid[])',
      '  union',
      '  select dependency.oid',
      '  from expanded',
      '  join pg_catalog.pg_type source_type on source_type.oid = expanded.oid',
      '  cross join lateral (values (nullif(source_type.typelem, 0)), (nullif(source_type.typbasetype, 0))) as dependency(oid)',
      '  where dependency.oid is not null',
      ')',
      'select',
      '  database_type.oid::integer as oid,',
      '  namespace.nspname as schema_name,',
      '  database_type.typname as type_name,',
      '  pg_catalog.format_type(database_type.oid, null) as formatted_name,',
      '  database_type.typtype as type_kind,',
      '  database_type.typcategory as type_category,',
      '  nullif(database_type.typelem, 0)::integer as element_type_oid,',
      '  nullif(database_type.typbasetype, 0)::integer as base_type_oid,',
      '  coalesce((',
      '    select json_agg(enum_value.enumlabel order by enum_value.enumsortorder)',
      '    from pg_catalog.pg_enum enum_value',
      '    where enum_value.enumtypid = database_type.oid',
      "  ), '[]'::json) as enum_values",
      'from (select distinct oid from expanded) requested',
      'join pg_catalog.pg_type database_type on database_type.oid = requested.oid',
      'join pg_catalog.pg_namespace namespace on namespace.oid = database_type.typnamespace',
      'order by database_type.oid',
    ].join('\n'),
    [requestedOids],
  );
  const entries = result.rows.map((row, index): [number, PostgresDatabaseTypeIdentity] => {
    const record = requireRecord(row, `database type[${index}]`);
    const oid = requireNumber(record.oid, `database type[${index}].oid`);
    const rawKind = requireString(record.type_kind, `database type[${index}].type_kind`);
    const category = requireString(record.type_category, `database type[${index}].type_category`);
    const elementTypeOid = readOptionalNumber(record.element_type_oid, `database type[${index}].element_type_oid`);
    const baseTypeOid = readOptionalNumber(record.base_type_oid, `database type[${index}].base_type_oid`);
    const enumValues = requireStringArray(record.enum_values, `database type[${index}].enum_values`);
    return [oid, {
      oid,
      schema: requireString(record.schema_name, `database type[${index}].schema_name`),
      name: requireString(record.type_name, `database type[${index}].type_name`),
      formattedName: requireString(record.formatted_name, `database type[${index}].formatted_name`),
      kind: classifyDatabaseType(rawKind, category, elementTypeOid),
      category,
      ...(elementTypeOid !== undefined ? { elementTypeOid } : {}),
      ...(baseTypeOid !== undefined ? { baseTypeOid } : {}),
      ...(rawKind === 'e' ? { enumValues } : {}),
    }];
  });
  return new Map(entries);
}

function mapDriverRepresentation(
  field: PostgresContractField,
  profile: PostgresDriverProfile,
  typesByOid: ReadonlyMap<number, PostgresDatabaseTypeIdentity>,
  direction: 'parameter' | 'result',
): PostgresDriverRepresentation {
  if (profile !== 'node-postgres-default') {
    return {
      position: field.position,
      ...(field.name ? { name: field.name } : {}),
      runtimeType: 'unknown',
      typeScriptType: 'unknown',
      provenance: 'unknown',
    };
  }
  const mapped = mapNodePostgresDefaultType(field.databaseType, typesByOid, direction, new Set());
  const typeScriptType = mapped.typeScriptType === 'unknown'
    ? 'unknown'
    : direction === 'parameter' || field.nullability.value !== 'non-null'
      ? `${mapped.typeScriptType} | null`
      : mapped.typeScriptType;
  return {
    position: field.position,
    ...(field.name ? { name: field.name } : {}),
    ...mapped,
    typeScriptType,
  };
}

function mapNodePostgresDefaultType(
  databaseType: PostgresDatabaseTypeIdentity,
  typesByOid: ReadonlyMap<number, PostgresDatabaseTypeIdentity>,
  direction: 'parameter' | 'result',
  visited: ReadonlySet<number>,
): Pick<PostgresDriverRepresentation, 'runtimeType' | 'typeScriptType' | 'provenance'> {
  if (visited.has(databaseType.oid)) {
    return unknownRepresentation();
  }
  const nextVisited = new Set(visited).add(databaseType.oid);
  if (databaseType.kind === 'array' && databaseType.elementTypeOid !== undefined) {
    const elementType = typesByOid.get(databaseType.elementTypeOid);
    if (!elementType) return { runtimeType: 'array', typeScriptType: 'unknown[]', provenance: 'unknown' };
    const element = mapNodePostgresDefaultType(elementType, typesByOid, direction, nextVisited);
    return {
      runtimeType: 'array',
      typeScriptType: `${parenthesizeArrayElementType(element.typeScriptType)}[]`,
      provenance: element.provenance,
    };
  }
  if (databaseType.kind === 'domain' && databaseType.baseTypeOid !== undefined) {
    const baseType = typesByOid.get(databaseType.baseTypeOid);
    return baseType ? mapNodePostgresDefaultType(baseType, typesByOid, direction, nextVisited) : unknownRepresentation();
  }
  if (databaseType.kind === 'enum') {
    return {
      runtimeType: 'string',
      typeScriptType: renderEnumTypeScriptType(databaseType.enumValues),
      provenance: 'driver-mapped',
    };
  }

  if (direction === 'parameter') {
    if (databaseType.oid === 20) return { runtimeType: 'string', typeScriptType: 'string | bigint', provenance: 'driver-mapped' };
    if (databaseType.oid === 1700) return { runtimeType: 'string', typeScriptType: 'string | number', provenance: 'driver-mapped' };
    if ([1082, 1114, 1184].includes(databaseType.oid)) {
      return { runtimeType: 'Date', typeScriptType: 'Date | string', provenance: 'driver-mapped' };
    }
  }

  if ([21, 23, 26, 700, 701].includes(databaseType.oid)) {
    return { runtimeType: 'number', typeScriptType: 'number', provenance: 'driver-mapped' };
  }
  if ([20, 1700].includes(databaseType.oid)) {
    return { runtimeType: 'string', typeScriptType: 'string', provenance: 'driver-mapped' };
  }
  if (databaseType.oid === 16) {
    return { runtimeType: 'boolean', typeScriptType: 'boolean', provenance: 'driver-mapped' };
  }
  if ([18, 19, 25, 1042, 1043, 1083, 1266, 2950].includes(databaseType.oid)) {
    return { runtimeType: 'string', typeScriptType: 'string', provenance: 'driver-mapped' };
  }
  if ([1082, 1114, 1184].includes(databaseType.oid)) {
    return { runtimeType: 'Date', typeScriptType: 'Date', provenance: 'driver-mapped' };
  }
  if ([114, 3802].includes(databaseType.oid)) {
    return { runtimeType: 'json-value', typeScriptType: 'unknown', provenance: 'driver-mapped' };
  }
  return unknownRepresentation();
}

function unknownRepresentation(): Pick<PostgresDriverRepresentation, 'runtimeType' | 'typeScriptType' | 'provenance'> {
  return { runtimeType: 'unknown', typeScriptType: 'unknown', provenance: 'unknown' };
}

function parenthesizeArrayElementType(typeScriptType: string): string {
  return typeScriptType.includes('|') ? `(${typeScriptType})` : typeScriptType;
}

function renderEnumTypeScriptType(enumValues: readonly string[] | undefined): string {
  return enumValues && enumValues.length > 0
    ? enumValues.map((value) => JSON.stringify(value)).join(' | ')
    : 'string';
}

function classifyDatabaseType(rawKind: string, category: string, elementTypeOid: number | undefined): PostgresDatabaseTypeKind {
  if (category === 'A' && elementTypeOid !== undefined) return 'array';
  switch (rawKind) {
    case 'b': return 'base';
    case 'c': return 'composite';
    case 'd': return 'domain';
    case 'e': return 'enum';
    case 'm': return 'multirange';
    case 'p': return 'pseudo';
    case 'r': return 'range';
    default: return 'unknown';
  }
}

function normalizeDriverProfile(profile: string): PostgresDriverProfile {
  if (profile === 'node-postgres-default') return profile;
  if (profile.startsWith('custom:') && profile.slice('custom:'.length).trim().length > 0) {
    return `custom:${profile.slice('custom:'.length).trim()}`;
  }
  throw new Error('Driver profile must be node-postgres-default or custom:<stable-id>.');
}

function parseContractField(value: unknown, label: string): PostgresContractField {
  const record = requireRecord(value, label);
  if (requireString(record.typeProvenance, `${label}.typeProvenance`) !== 'proven') {
    throw new Error(`${label}.typeProvenance must be proven.`);
  }
  return {
    position: requireNumber(record.position, `${label}.position`),
    ...readOptionalName(record.name, `${label}.name`),
    databaseType: parseDatabaseType(record.databaseType, `${label}.databaseType`),
    typeProvenance: 'proven',
    nullability: parseNullability(record.nullability, `${label}.nullability`),
  };
}

function parseContractResult(value: unknown, label: string): PostgresContractResult {
  const field = parseContractField(value, label);
  const record = requireRecord(value, label);
  const nameProvenance = requireString(record.nameProvenance, `${label}.nameProvenance`);
  if (nameProvenance !== 'inferred' && nameProvenance !== 'unknown') {
    throw new Error(`${label}.nameProvenance must be inferred or unknown.`);
  }
  return { ...field, nameProvenance };
}

function parseDatabaseType(value: unknown, label: string): PostgresDatabaseTypeIdentity {
  const record = requireRecord(value, label);
  const rawKind = requireString(record.kind, `${label}.kind`);
  const kinds: readonly PostgresDatabaseTypeKind[] = [
    'base', 'array', 'enum', 'domain', 'composite', 'range', 'multirange', 'pseudo', 'unknown',
  ];
  const kind = kinds.find((candidate) => candidate === rawKind);
  if (!kind) throw new Error(`${label}.kind is invalid.`);
  const elementTypeOid = readOptionalNumber(record.elementTypeOid, `${label}.elementTypeOid`);
  const baseTypeOid = readOptionalNumber(record.baseTypeOid, `${label}.baseTypeOid`);
  const enumValues = record.enumValues === undefined
    ? undefined
    : requireStringArray(record.enumValues, `${label}.enumValues`);
  return {
    oid: requireNumber(record.oid, `${label}.oid`),
    schema: requireString(record.schema, `${label}.schema`),
    name: requireString(record.name, `${label}.name`),
    formattedName: requireString(record.formattedName, `${label}.formattedName`),
    kind,
    category: requireString(record.category, `${label}.category`),
    ...(elementTypeOid !== undefined ? { elementTypeOid } : {}),
    ...(baseTypeOid !== undefined ? { baseTypeOid } : {}),
    ...(enumValues !== undefined ? { enumValues } : {}),
  };
}

function parseNullability(value: unknown, label: string): PostgresContractNullability {
  const record = requireRecord(value, label);
  const rawValue = requireString(record.value, `${label}.value`);
  const rawProvenance = requireString(record.provenance, `${label}.provenance`);
  if (rawValue !== 'non-null' && rawValue !== 'nullable' && rawValue !== 'unknown') {
    throw new Error(`${label}.value is invalid.`);
  }
  if (rawProvenance !== 'inferred' && rawProvenance !== 'unknown') {
    throw new Error(`${label}.provenance is invalid.`);
  }
  return { value: rawValue, provenance: rawProvenance };
}

function parseDriverRepresentation(value: unknown, label: string): PostgresDriverRepresentation {
  const record = requireRecord(value, label);
  const rawRuntimeType = requireString(record.runtimeType, `${label}.runtimeType`);
  const runtimeTypes: readonly PostgresDriverRepresentation['runtimeType'][] = [
    'number', 'string', 'boolean', 'Date', 'array', 'json-value', 'unknown',
  ];
  const runtimeType = runtimeTypes.find((candidate) => candidate === rawRuntimeType);
  if (!runtimeType) throw new Error(`${label}.runtimeType is invalid.`);
  const rawProvenance = requireString(record.provenance, `${label}.provenance`);
  if (rawProvenance !== 'driver-mapped' && rawProvenance !== 'unknown') {
    throw new Error(`${label}.provenance is invalid.`);
  }
  return {
    position: requireNumber(record.position, `${label}.position`),
    ...readOptionalName(record.name, `${label}.name`),
    runtimeType,
    typeScriptType: requireString(record.typeScriptType, `${label}.typeScriptType`),
    provenance: rawProvenance,
  };
}

function readOptionalName(value: unknown, label: string): { name?: string } {
  if (value === undefined) return {};
  return { name: requireString(value, label) };
}

function requireDatabaseType(
  typesByOid: ReadonlyMap<number, PostgresDatabaseTypeIdentity>,
  oid: number,
): PostgresDatabaseTypeIdentity {
  const databaseType = typesByOid.get(oid);
  if (!databaseType) throw new Error(`PostgreSQL catalog metadata was missing for type OID ${oid}.`);
  return databaseType;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`PostgreSQL returned an invalid ${label} row.`);
  }
  return Object.fromEntries(Object.entries(value));
}

function requireNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error(`PostgreSQL returned an invalid numeric ${label}.`);
  }
  return value;
}

function readOptionalNumber(value: unknown, label: string): number | undefined {
  if (value === null || value === undefined) return undefined;
  return requireNumber(value, label);
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`PostgreSQL returned an invalid string ${label}.`);
  return value;
}

function requireStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new Error(`PostgreSQL returned an invalid string array ${label}.`);
  }
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value;
}

function stripTrailingSemicolon(sql: string): string {
  return sql.trim().replace(/;\s*$/, '');
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function hashSql(sql: string): string {
  return `sha256:${createHash('sha256').update(normalizeSqlSource(sql)).digest('hex')}`;
}
