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

export interface PostgresDomainConstraint {
  name: string;
  definition: string;
  validated: boolean;
}

/** Cluster-independent type identity used for snapshots and cross-database comparison. */
export interface PostgresPortableDatabaseTypeIdentity {
  schema: string;
  name: string;
  formattedName: string;
  kind: PostgresDatabaseTypeKind;
  category: string;
  typeModifier?: number;
  elementType?: PostgresPortableDatabaseTypeIdentity;
  baseType?: PostgresPortableDatabaseTypeIdentity;
  enumValues?: string[];
  domainConstraints?: PostgresDomainConstraint[];
}

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
  typeModifier?: number;
  domainConstraints?: PostgresDomainConstraint[];
  portableIdentity?: PostgresPortableDatabaseTypeIdentity;
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
  typeModifier?: number;
}

export interface PostgresContractResult extends PostgresContractField {
  nameProvenance: 'proven' | 'inferred' | 'unknown';
}

export interface PostgresQueryDependency {
  kind: 'column' | 'relation' | 'function';
  schema: string;
  name: string;
  relationKind?: string;
  column?: string;
  columnNotNull?: boolean;
  columnType?: PostgresPortableDatabaseTypeIdentity;
  columnTypeModifier?: number;
  definitionHash?: string;
  identityArguments?: string;
  resultType?: string;
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
    dependencies?: PostgresQueryDependency[];
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
type DescribedResult = PositionedOid & { name: string; typeModifier?: number };
type RawQueryDependency = Omit<PostgresQueryDependency, 'columnType'> & { columnTypeOid?: number };

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
      ...(database.dependencies === undefined ? {} : {
        dependencies: requireArray(database.dependencies, 'PostgreSQL contract.database.dependencies').map((dependency, index) =>
          parseQueryDependency(dependency, `PostgreSQL contract.database.dependencies[${index}]`)),
      }),
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
    let typesByOid = await readDatabaseTypes(client, allOids);
    const diagnostics: Array<{ code: string; message: string }> = [];
    const described = await describeSelectResultAndDependencies(client, preparedSql, parameterOids, typesByOid);
    diagnostics.push(...described.diagnostics);
    if (described.additionalTypeOids.length > 0) {
      typesByOid = await readDatabaseTypes(client, [...new Set([...allOids, ...described.additionalTypeOids])]);
    }
    const describedResults = described.results.length === resultOids.length ? described.results : undefined;
    const hasExactResultNames = describedResults !== undefined || options.resultColumnOrder.length === resultOids.length;
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
      const describedResult = describedResults?.[entry.position - 1];
      const name = describedResult?.name ?? (hasExactResultNames ? options.resultColumnOrder[entry.position - 1] : undefined);
      return buildResultContract(
        entry,
        name,
        requireDatabaseType(typesByOid, entry.oid),
        name ? options.resultColumnNullability[name] : undefined,
        describedResult?.typeModifier,
        describedResult ? 'proven' : name ? 'inferred' : 'unknown',
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
        ...(described.dependencies.length > 0 ? {
          dependencies: materializeDependencyTypes(described.dependencies, typesByOid),
        } : {}),
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
  typeModifier: number | undefined,
  nameProvenance: PostgresContractResult['nameProvenance'],
): PostgresContractResult {
  const value = nullability ?? 'unknown';
  return {
    position: entry.position,
    ...(name ? { name } : {}),
    nameProvenance,
    databaseType,
    typeProvenance: 'proven',
    ...(typeModifier !== undefined ? { typeModifier } : {}),
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
      '  database_type.typtypmod::integer as type_modifier,',
      '  nullif(database_type.typelem, 0)::integer as element_type_oid,',
      '  nullif(database_type.typbasetype, 0)::integer as base_type_oid,',
      '  coalesce((',
      '    select json_agg(enum_value.enumlabel order by enum_value.enumsortorder)',
      '    from pg_catalog.pg_enum enum_value',
      '    where enum_value.enumtypid = database_type.oid',
      "  ), '[]'::json) as enum_values,",
      '  coalesce((',
      '    select json_agg(json_build_object(',
      "      'name', domain_constraint.conname,",
      "      'definition', pg_catalog.pg_get_constraintdef(domain_constraint.oid, true),",
      "      'validated', domain_constraint.convalidated",
      '    ) order by domain_constraint.conname)',
      '    from pg_catalog.pg_constraint domain_constraint',
      "    where domain_constraint.contypid = database_type.oid and domain_constraint.contype = 'c'",
      "  ), '[]'::json) as domain_constraints",
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
    const typeModifier = readOptionalTypeModifier(record.type_modifier, `database type[${index}].type_modifier`);
    const domainConstraints = parseDomainConstraints(record.domain_constraints, `database type[${index}].domain_constraints`);
    return [oid, {
      oid,
      schema: requireString(record.schema_name, `database type[${index}].schema_name`),
      name: requireString(record.type_name, `database type[${index}].type_name`),
      formattedName: requireString(record.formatted_name, `database type[${index}].formatted_name`),
      kind: classifyDatabaseType(rawKind, category, elementTypeOid),
      category,
      ...(typeModifier !== undefined ? { typeModifier } : {}),
      ...(elementTypeOid !== undefined ? { elementTypeOid } : {}),
      ...(baseTypeOid !== undefined ? { baseTypeOid } : {}),
      ...(rawKind === 'e' ? { enumValues } : {}),
      ...(rawKind === 'd' ? { domainConstraints } : {}),
    }];
  });
  const typesByOid = new Map(entries);
  for (const [oid, databaseType] of typesByOid) {
    databaseType.portableIdentity = buildPortableTypeIdentity(databaseType, typesByOid, new Set([oid]));
  }
  return typesByOid;
}

async function describeSelectResultAndDependencies(
  client: PostgresContractQueryable,
  preparedSql: string,
  parameterOids: readonly PositionedOid[],
  typesByOid: ReadonlyMap<number, PostgresDatabaseTypeIdentity>,
): Promise<{
  results: DescribedResult[];
  dependencies: RawQueryDependency[];
  additionalTypeOids: number[];
  diagnostics: Array<{ code: string; message: string }>;
}> {
  if (!/^(select|with)\b/i.test(preparedSql.trim())) {
    return { results: [], dependencies: [], additionalTypeOids: [], diagnostics: [] };
  }
  const viewName = `ashiba_contract_view_${randomUUID().replaceAll('-', '').slice(0, 20)}`;
  const boundSql = substitutePreparedParameters(preparedSql, (rawPosition) => {
    const oid = parameterOids.find((entry) => entry.position === Number(rawPosition))?.oid;
    const type = oid === undefined ? undefined : typesByOid.get(oid);
    if (!type) throw new Error(`PostgreSQL parameter $${rawPosition} did not have catalog type metadata.`);
    return `null::${type.formattedName}`;
  });
  await client.query('savepoint ashiba_contract_describe');
  try {
    await client.query(`create temporary view ${quoteIdentifier(viewName)} as ${boundSql}`);
    const viewResult = await client.query([
      'select relation.oid::integer as oid',
      'from pg_catalog.pg_class relation',
      'where relation.relnamespace = pg_catalog.pg_my_temp_schema() and relation.relname = $1',
    ].join('\n'), [viewName]);
    const viewOid = requireNumber(requireRecord(viewResult.rows[0], 'temporary view').oid, 'temporary view.oid');
    const outputResult = await client.query([
      'select attribute.attnum::integer as position, attribute.attname as name,',
      '  attribute.atttypid::integer as oid, attribute.atttypmod::integer as type_modifier',
      'from pg_catalog.pg_attribute attribute',
      'where attribute.attrelid = $1::oid and attribute.attnum > 0 and not attribute.attisdropped',
      'order by attribute.attnum',
    ].join('\n'), [viewOid]);
    const results = outputResult.rows.map((row, index): DescribedResult => {
      const record = requireRecord(row, `described result[${index}]`);
      return {
        position: requireNumber(record.position, `described result[${index}].position`),
        name: requireString(record.name, `described result[${index}].name`),
        oid: requireNumber(record.oid, `described result[${index}].oid`),
        ...readTypeModifierProperty(record.type_modifier, `described result[${index}].type_modifier`),
      };
    });
    const relationResult = await client.query([
      'select distinct',
      "  case when dependency.refobjsubid > 0 then 'column' else 'relation' end as dependency_kind,",
      '  namespace.nspname as schema_name, relation.relname as object_name, relation.relkind as relation_kind,',
      '  attribute.attname as column_name, attribute.attnotnull as column_not_null,',
      '  attribute.atttypid::integer as column_type_oid, attribute.atttypmod::integer as column_type_modifier,',
      "  case when relation.relkind in ('v', 'm') then pg_catalog.pg_get_viewdef(relation.oid, true) else null end as definition",
      'from pg_catalog.pg_rewrite rewrite',
      'join pg_catalog.pg_depend dependency',
      "  on dependency.classid = 'pg_catalog.pg_rewrite'::regclass and dependency.objid = rewrite.oid",
      'join pg_catalog.pg_class relation',
      "  on dependency.refclassid = 'pg_catalog.pg_class'::regclass and relation.oid = dependency.refobjid",
      'join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace',
      'left join pg_catalog.pg_attribute attribute',
      '  on attribute.attrelid = relation.oid and attribute.attnum = dependency.refobjsubid and dependency.refobjsubid > 0',
      'where rewrite.ev_class = $1::oid and relation.oid <> $1::oid',
      'order by schema_name, object_name, column_name nulls first',
    ].join('\n'), [viewOid]);
    const functionResult = await client.query([
      'select distinct namespace.nspname as schema_name, procedure.proname as object_name,',
      '  pg_catalog.pg_get_function_identity_arguments(procedure.oid) as identity_arguments,',
      '  pg_catalog.pg_get_function_result(procedure.oid) as result_type',
      'from pg_catalog.pg_rewrite rewrite',
      'join pg_catalog.pg_depend dependency',
      "  on dependency.classid = 'pg_catalog.pg_rewrite'::regclass and dependency.objid = rewrite.oid",
      'join pg_catalog.pg_proc procedure',
      "  on dependency.refclassid = 'pg_catalog.pg_proc'::regclass and procedure.oid = dependency.refobjid",
      'join pg_catalog.pg_namespace namespace on namespace.oid = procedure.pronamespace',
      'where rewrite.ev_class = $1::oid',
      'order by schema_name, object_name, identity_arguments',
    ].join('\n'), [viewOid]);
    const relationDependencies = relationResult.rows.map((row, index): RawQueryDependency => {
      const record = requireRecord(row, `relation dependency[${index}]`);
      const kind = requireString(record.dependency_kind, `relation dependency[${index}].dependency_kind`);
      const definition = readOptionalString(record.definition, `relation dependency[${index}].definition`);
      const columnTypeOid = readOptionalNumber(record.column_type_oid, `relation dependency[${index}].column_type_oid`);
      const columnTypeModifier = readOptionalTypeModifier(record.column_type_modifier, `relation dependency[${index}].column_type_modifier`);
      return {
        kind: kind === 'column' ? 'column' : 'relation',
        schema: requireString(record.schema_name, `relation dependency[${index}].schema_name`),
        name: requireString(record.object_name, `relation dependency[${index}].object_name`),
        relationKind: requireString(record.relation_kind, `relation dependency[${index}].relation_kind`),
        ...(record.column_name === null ? {} : { column: requireString(record.column_name, `relation dependency[${index}].column_name`) }),
        ...(record.column_not_null === null ? {} : { columnNotNull: requireBoolean(record.column_not_null, `relation dependency[${index}].column_not_null`) }),
        ...(columnTypeOid !== undefined ? { columnTypeOid } : {}),
        ...(columnTypeModifier !== undefined ? { columnTypeModifier } : {}),
        ...(definition ? { definitionHash: hashSql(definition) } : {}),
      };
    });
    const functionDependencies = functionResult.rows.map((row, index): RawQueryDependency => {
      const record = requireRecord(row, `function dependency[${index}]`);
      return {
        kind: 'function',
        schema: requireString(record.schema_name, `function dependency[${index}].schema_name`),
        name: requireString(record.object_name, `function dependency[${index}].object_name`),
        identityArguments: requireString(record.identity_arguments, `function dependency[${index}].identity_arguments`),
        resultType: requireString(record.result_type, `function dependency[${index}].result_type`),
      };
    });
    await client.query('release savepoint ashiba_contract_describe');
    const additionalTypeOids = [...new Set([
      ...results.map((entry) => entry.oid),
      ...relationDependencies.flatMap((entry) => entry.columnTypeOid === undefined ? [] : [entry.columnTypeOid]),
    ])].sort((left, right) => left - right);
    return {
      results,
      dependencies: [...relationDependencies, ...functionDependencies].sort(compareDependencies),
      additionalTypeOids,
      diagnostics: [],
    };
  } catch (error) {
    await client.query('rollback to savepoint ashiba_contract_describe');
    return {
      results: [],
      dependencies: [],
      additionalTypeOids: [],
      diagnostics: [{
        code: 'ASHIBA_POSTGRES_SELECT_DESCRIPTION_DEGRADED',
        message: `PostgreSQL could prepare the statement but could not describe it through a temporary view: ${(error instanceof Error ? error.message : String(error)).replaceAll(viewName, '<temporary-view>')}`,
      }],
    };
  }
}

function substitutePreparedParameters(sql: string, replacement: (position: string) => string): string {
  let output = '';
  let index = 0;
  let state: 'normal' | 'single' | 'double' | 'line-comment' | 'block-comment' | 'dollar-quote' = 'normal';
  let dollarTag = '';
  let blockDepth = 0;
  while (index < sql.length) {
    const current = sql[index] ?? '';
    const next = sql[index + 1] ?? '';
    if (state === 'normal') {
      if (current === "'") state = 'single';
      else if (current === '"') state = 'double';
      else if (current === '-' && next === '-') state = 'line-comment';
      else if (current === '/' && next === '*') { state = 'block-comment'; blockDepth = 1; }
      else if (current === '$') {
        const placeholder = /^\$(\d+)/.exec(sql.slice(index));
        if (placeholder?.[1]) {
          output += replacement(placeholder[1]);
          index += placeholder[0].length;
          continue;
        }
        const tag = /^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(index));
        if (tag) { state = 'dollar-quote'; dollarTag = tag[0]; output += dollarTag; index += dollarTag.length; continue; }
      }
      output += current;
      index += 1;
      continue;
    }
    output += current;
    index += 1;
    if (state === 'single' && current === "'") {
      if (next === "'") { output += next; index += 1; } else state = 'normal';
    } else if (state === 'double' && current === '"') {
      if (next === '"') { output += next; index += 1; } else state = 'normal';
    } else if (state === 'line-comment' && current === '\n') {
      state = 'normal';
    } else if (state === 'block-comment') {
      if (current === '/' && next === '*') { output += next; index += 1; blockDepth += 1; }
      else if (current === '*' && next === '/') {
        output += next;
        index += 1;
        blockDepth -= 1;
        if (blockDepth === 0) state = 'normal';
      }
    } else if (state === 'dollar-quote' && current === '$') {
      const remainder = sql.slice(index - 1);
      if (remainder.startsWith(dollarTag)) {
        output += dollarTag.slice(1);
        index += dollarTag.length - 1;
        state = 'normal';
        dollarTag = '';
      }
    }
  }
  return output;
}

function materializeDependencyTypes(
  dependencies: readonly RawQueryDependency[],
  typesByOid: ReadonlyMap<number, PostgresDatabaseTypeIdentity>,
): PostgresQueryDependency[] {
  return dependencies.map(({ columnTypeOid, ...dependency }) => ({
    ...dependency,
    ...(columnTypeOid === undefined ? {} : {
      columnType: requireDatabaseType(typesByOid, columnTypeOid).portableIdentity,
    }),
  }));
}

function compareDependencies(left: RawQueryDependency, right: RawQueryDependency): number {
  return [left.kind, left.schema, left.name, left.column ?? '', left.identityArguments ?? ''].join('\0')
    .localeCompare([right.kind, right.schema, right.name, right.column ?? '', right.identityArguments ?? ''].join('\0'));
}

function buildPortableTypeIdentity(
  databaseType: PostgresDatabaseTypeIdentity,
  typesByOid: ReadonlyMap<number, PostgresDatabaseTypeIdentity>,
  visited: ReadonlySet<number>,
): PostgresPortableDatabaseTypeIdentity {
  const nested = (oid: number | undefined): PostgresPortableDatabaseTypeIdentity | undefined => {
    if (oid === undefined || visited.has(oid)) return undefined;
    const type = typesByOid.get(oid);
    return type ? buildPortableTypeIdentity(type, typesByOid, new Set(visited).add(oid)) : undefined;
  };
  return {
    schema: databaseType.schema,
    name: databaseType.name,
    formattedName: databaseType.formattedName,
    kind: databaseType.kind,
    category: databaseType.category,
    ...(databaseType.typeModifier !== undefined ? { typeModifier: databaseType.typeModifier } : {}),
    ...(nested(databaseType.elementTypeOid) ? { elementType: nested(databaseType.elementTypeOid) } : {}),
    ...(nested(databaseType.baseTypeOid) ? { baseType: nested(databaseType.baseTypeOid) } : {}),
    ...(databaseType.enumValues ? { enumValues: [...databaseType.enumValues] } : {}),
    ...(databaseType.domainConstraints ? { domainConstraints: databaseType.domainConstraints.map((constraint) => ({ ...constraint })) } : {}),
  };
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
    ...readTypeModifierProperty(record.typeModifier, `${label}.typeModifier`),
  };
}

function parseContractResult(value: unknown, label: string): PostgresContractResult {
  const field = parseContractField(value, label);
  const record = requireRecord(value, label);
  const nameProvenance = requireString(record.nameProvenance, `${label}.nameProvenance`);
  if (nameProvenance !== 'proven' && nameProvenance !== 'inferred' && nameProvenance !== 'unknown') {
    throw new Error(`${label}.nameProvenance must be proven, inferred, or unknown.`);
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
  const typeModifier = readOptionalTypeModifier(record.typeModifier, `${label}.typeModifier`);
  const domainConstraints = record.domainConstraints === undefined
    ? undefined
    : parseDomainConstraints(record.domainConstraints, `${label}.domainConstraints`);
  const portableIdentity = record.portableIdentity === undefined
    ? undefined
    : parsePortableTypeIdentity(record.portableIdentity, `${label}.portableIdentity`);
  return {
    oid: requireNumber(record.oid, `${label}.oid`),
    schema: requireString(record.schema, `${label}.schema`),
    name: requireString(record.name, `${label}.name`),
    formattedName: requireString(record.formattedName, `${label}.formattedName`),
    kind,
    category: requireString(record.category, `${label}.category`),
    ...(typeModifier !== undefined ? { typeModifier } : {}),
    ...(elementTypeOid !== undefined ? { elementTypeOid } : {}),
    ...(baseTypeOid !== undefined ? { baseTypeOid } : {}),
    ...(enumValues !== undefined ? { enumValues } : {}),
    ...(domainConstraints !== undefined ? { domainConstraints } : {}),
    ...(portableIdentity !== undefined ? { portableIdentity } : {}),
  };
}

function parsePortableTypeIdentity(value: unknown, label: string): PostgresPortableDatabaseTypeIdentity {
  const record = requireRecord(value, label);
  const kind = parseDatabaseTypeKind(record.kind, `${label}.kind`);
  const typeModifier = readOptionalTypeModifier(record.typeModifier, `${label}.typeModifier`);
  return {
    schema: requireString(record.schema, `${label}.schema`),
    name: requireString(record.name, `${label}.name`),
    formattedName: requireString(record.formattedName, `${label}.formattedName`),
    kind,
    category: requireString(record.category, `${label}.category`),
    ...(typeModifier !== undefined ? { typeModifier } : {}),
    ...(record.elementType === undefined ? {} : { elementType: parsePortableTypeIdentity(record.elementType, `${label}.elementType`) }),
    ...(record.baseType === undefined ? {} : { baseType: parsePortableTypeIdentity(record.baseType, `${label}.baseType`) }),
    ...(record.enumValues === undefined ? {} : { enumValues: requireStringArray(record.enumValues, `${label}.enumValues`) }),
    ...(record.domainConstraints === undefined ? {} : {
      domainConstraints: parseDomainConstraints(record.domainConstraints, `${label}.domainConstraints`),
    }),
  };
}

function parseDatabaseTypeKind(value: unknown, label: string): PostgresDatabaseTypeKind {
  const rawKind = requireString(value, label);
  const kinds: readonly PostgresDatabaseTypeKind[] = [
    'base', 'array', 'enum', 'domain', 'composite', 'range', 'multirange', 'pseudo', 'unknown',
  ];
  const kind = kinds.find((candidate) => candidate === rawKind);
  if (!kind) throw new Error(`${label} is invalid.`);
  return kind;
}

function parseDomainConstraints(value: unknown, label: string): PostgresDomainConstraint[] {
  return requireArray(value, label).map((entry, index) => {
    const record = requireRecord(entry, `${label}[${index}]`);
    return {
      name: requireString(record.name, `${label}[${index}].name`),
      definition: requireString(record.definition, `${label}[${index}].definition`),
      validated: requireBoolean(record.validated, `${label}[${index}].validated`),
    };
  });
}

function parseQueryDependency(value: unknown, label: string): PostgresQueryDependency {
  const record = requireRecord(value, label);
  const rawKind = requireString(record.kind, `${label}.kind`);
  if (rawKind !== 'column' && rawKind !== 'relation' && rawKind !== 'function') {
    throw new Error(`${label}.kind is invalid.`);
  }
  return {
    kind: rawKind,
    schema: requireString(record.schema, `${label}.schema`),
    name: requireString(record.name, `${label}.name`),
    ...readOptionalStringProperty(record.relationKind, 'relationKind', `${label}.relationKind`),
    ...readOptionalStringProperty(record.column, 'column', `${label}.column`),
    ...(record.columnNotNull === undefined ? {} : { columnNotNull: requireBoolean(record.columnNotNull, `${label}.columnNotNull`) }),
    ...(record.columnType === undefined ? {} : { columnType: parsePortableTypeIdentity(record.columnType, `${label}.columnType`) }),
    ...readTypeModifierNamedProperty(record.columnTypeModifier, 'columnTypeModifier', `${label}.columnTypeModifier`),
    ...readOptionalStringProperty(record.definitionHash, 'definitionHash', `${label}.definitionHash`),
    ...readOptionalStringProperty(record.identityArguments, 'identityArguments', `${label}.identityArguments`),
    ...readOptionalStringProperty(record.resultType, 'resultType', `${label}.resultType`),
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

function readOptionalTypeModifier(value: unknown, label: string): number | undefined {
  const typeModifier = readOptionalNumber(value, label);
  return typeModifier === undefined || typeModifier < 0 ? undefined : typeModifier;
}

function readTypeModifierProperty(value: unknown, label: string): { typeModifier?: number } {
  const typeModifier = readOptionalTypeModifier(value, label);
  return typeModifier === undefined ? {} : { typeModifier };
}

function readTypeModifierNamedProperty<Key extends string>(
  value: unknown,
  key: Key,
  label: string,
): { [Property in Key]?: number } {
  const typeModifier = readOptionalTypeModifier(value, label);
  return typeModifier === undefined ? {} : { [key]: typeModifier } as { [Property in Key]?: number };
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`PostgreSQL returned an invalid string ${label}.`);
  return value;
}

function readOptionalString(value: unknown, label: string): string | undefined {
  if (value === null || value === undefined) return undefined;
  return requireString(value, label);
}

function readOptionalStringProperty<Key extends string>(
  value: unknown,
  key: Key,
  label: string,
): { [Property in Key]?: string } {
  const result = readOptionalString(value, label);
  return result === undefined ? {} : { [key]: result } as { [Property in Key]?: string };
}

function requireBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`PostgreSQL returned an invalid boolean ${label}.`);
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
