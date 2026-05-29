<div v-pre>
# Variable: validateFixtureRowsAgainstTableDefinitions

> `const` **validateFixtureRowsAgainstTableDefinitions**: (`tableRows`, `tableDefinitions`, `contextLabel?`, `tableNameResolver?`) => `void`

Defined in: node\_modules/.pnpm/@rawsql-ts+testkit-postgres@0.16.0/node\_modules/@rawsql-ts/testkit-postgres/dist/utils/fixtureValidation.d.ts:12

Validates fixture rows against table definitions, ensuring every referenced
table and column exists in the configured DDL or explicit definitions.

## Parameters

### tableRows

[`TableRowsFixture`](../interfaces/TableRowsFixture.md)[] \| `undefined`

Fixtures to validate; undefined or empty arrays are no-ops.

### tableDefinitions

[`TableDefinitionModel`](../interfaces/TableDefinitionModel.md)[]

Table metadata to validate against.

### contextLabel?

`string`

Optional label prefixed to thrown error messages for clarity.

### tableNameResolver?

`TableNameResolver`

## Returns

`void`

## Throws

Error when a fixture references a missing table or column.
</div>
