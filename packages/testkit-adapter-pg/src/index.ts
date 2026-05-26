import {
  createPostgresTestkitClient as createRawPostgresTestkitClient,
  PostgresTestkitClient,
  resolveFixtureState,
  validateFixtureRowsAgainstTableDefinitions,
} from '@rawsql-ts/testkit-postgres';
import type {
  CreatePostgresTestkitClientOptions,
  FixtureResolutionOptions,
  GeneratedFixtureManifest,
  PostgresQueryInput,
  QueryExecutionResult,
  QueryExecutor,
  ResolvedFixtureState,
  Row,
  SchemaResolutionOptions,
  TableDefinitionModel,
  TableRowsFixture,
  TypedQueryExecutor,
} from '@rawsql-ts/testkit-postgres';

/**
 * Creates an Ashiba Postgres ZTD testkit client backed by the tested rawsql-ts implementation.
 */
export function createPostgresTestkitClient<RowType extends Row>(
  options: CreatePostgresTestkitClientOptions<RowType>,
): PostgresTestkitClient<RowType> {
  return createRawPostgresTestkitClient(options);
}

/**
 * Postgres ZTD testkit client class for fixture-backed SQL mapper tests.
 */
export { PostgresTestkitClient };

/**
 * Validates fixture rows against table definitions before testkit execution.
 */
export { validateFixtureRowsAgainstTableDefinitions };

/**
 * Resolves fixture state for ZTD testkit execution.
 */
export { resolveFixtureState };

export type {
  CreatePostgresTestkitClientOptions,
  FixtureResolutionOptions,
  GeneratedFixtureManifest,
  PostgresQueryInput,
  QueryExecutionResult,
  QueryExecutor,
  ResolvedFixtureState,
  Row,
  SchemaResolutionOptions,
  TableDefinitionModel,
  TableRowsFixture,
  TypedQueryExecutor,
};
