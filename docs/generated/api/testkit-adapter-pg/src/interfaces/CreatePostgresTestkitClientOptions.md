<div v-pre>
# Interface: CreatePostgresTestkitClientOptions&lt;RowType\&gt;

Defined in: node\_modules/.pnpm/@rawsql-ts+testkit-postgres@0.16.0/node\_modules/@rawsql-ts/testkit-postgres/dist/types.d.ts:61

Configuration for initializing a `PostgresTestkitClient`, including fixtures, formatter options, and executor wiring.

## Extends

- [`SchemaResolutionOptions`](SchemaResolutionOptions.md)

## Type Parameters

### RowType

`RowType` *extends* [`Row`](../type-aliases/Row.md) = [`Row`](../type-aliases/Row.md)

The row shape produced by the provided executor.

## Properties

### defaultSchema?

> `optional` **defaultSchema?**: `string`

Defined in: node\_modules/.pnpm/@rawsql-ts+testkit-postgres@0.16.0/node\_modules/@rawsql-ts/testkit-postgres/dist/types.d.ts:36

#### Inherited from

[`SchemaResolutionOptions`](SchemaResolutionOptions.md).[`defaultSchema`](SchemaResolutionOptions.md#defaultschema)

***

### searchPath?

> `optional` **searchPath?**: `string`[]

Defined in: node\_modules/.pnpm/@rawsql-ts+testkit-postgres@0.16.0/node\_modules/@rawsql-ts/testkit-postgres/dist/types.d.ts:37

#### Inherited from

[`SchemaResolutionOptions`](SchemaResolutionOptions.md).[`searchPath`](SchemaResolutionOptions.md#searchpath)

***

### queryExecutor

> **queryExecutor**: [`TypedQueryExecutor`](../type-aliases/TypedQueryExecutor.md)&lt;`RowType`\&gt;

Defined in: node\_modules/.pnpm/@rawsql-ts+testkit-postgres@0.16.0/node\_modules/@rawsql-ts/testkit-postgres/dist/types.d.ts:62

The driver executor used to run rewritten SQL.

***

### generated?

> `optional` **generated?**: [`GeneratedFixtureManifest`](GeneratedFixtureManifest.md)

Defined in: node\_modules/.pnpm/@rawsql-ts+testkit-postgres@0.16.0/node\_modules/@rawsql-ts/testkit-postgres/dist/types.d.ts:63

Optional generated runtime metadata from `ztd-config`; preferred over raw DDL directories.

***

### tableDefinitions?

> `optional` **tableDefinitions?**: [`TableDefinitionModel`](TableDefinitionModel.md)[]

Defined in: node\_modules/.pnpm/@rawsql-ts+testkit-postgres@0.16.0/node\_modules/@rawsql-ts/testkit-postgres/dist/types.d.ts:64

Optional table metadata that describes the schema.

***

### tableRows?

> `optional` **tableRows?**: [`TableRowsFixture`](TableRowsFixture.md)[]

Defined in: node\_modules/.pnpm/@rawsql-ts+testkit-postgres@0.16.0/node\_modules/@rawsql-ts/testkit-postgres/dist/types.d.ts:65

Optional fixture rows seeded for tests.

***

### formatterOptions?

> `optional` **formatterOptions?**: `SqlFormatterOptions`

Defined in: node\_modules/.pnpm/@rawsql-ts+testkit-postgres@0.16.0/node\_modules/@rawsql-ts/testkit-postgres/dist/types.d.ts:66

SQL formatter tweaks that influence the rewritten queries.

***

### missingFixtureStrategy?

> `optional` **missingFixtureStrategy?**: `MissingFixtureStrategy`

Defined in: node\_modules/.pnpm/@rawsql-ts+testkit-postgres@0.16.0/node\_modules/@rawsql-ts/testkit-postgres/dist/types.d.ts:67

Strategy for resolving missing fixtures (error/skip).

***

### ddl?

> `optional` **ddl?**: `DdlFixtureLoaderOptions`

Defined in: node\_modules/.pnpm/@rawsql-ts+testkit-postgres@0.16.0/node\_modules/@rawsql-ts/testkit-postgres/dist/types.d.ts:68

DDL loader options used during schema resolution.

***

### onExecute?

> `optional` **onExecute?**: (`sql`, `params?`, `fixtures?`) => `void`

Defined in: node\_modules/.pnpm/@rawsql-ts+testkit-postgres@0.16.0/node\_modules/@rawsql-ts/testkit-postgres/dist/types.d.ts:69

Optional hook invoked when the client executes rewritten SQL.

#### Parameters

##### sql

`string`

##### params?

`unknown`[]

##### fixtures?

`string`[]

#### Returns

`void`

***

### disposeExecutor?

> `optional` **disposeExecutor?**: () => `void` \| `Promise`&lt;`void`\&gt;

Defined in: node\_modules/.pnpm/@rawsql-ts+testkit-postgres@0.16.0/node\_modules/@rawsql-ts/testkit-postgres/dist/types.d.ts:70

Optional cleanup function called when the client closes.

#### Returns

`void` \| `Promise`&lt;`void`\&gt;
</div>
