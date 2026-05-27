<div v-pre>
# Class: PostgresTestkitClient&lt;RowType\&gt;

Defined in: node\_modules/.pnpm/@rawsql-ts+testkit-postgres@0.16.0/node\_modules/@rawsql-ts/testkit-postgres/dist/client/PostgresTestkitClient.d.ts:10

The driver-agnostic Postgres testkit client that rewrites SQL using fixtures and delegates to a QueryExecutor.

## Type Parameters

### RowType

`RowType` *extends* [`Row`](../type-aliases/Row.md) = [`Row`](../type-aliases/Row.md)

## Constructors

### Constructor

> **new PostgresTestkitClient**&lt;`RowType`\&gt;(`options`, `scopedRows?`, `context?`): `PostgresTestkitClient`&lt;`RowType`\&gt;

Defined in: node\_modules/.pnpm/@rawsql-ts+testkit-postgres@0.16.0/node\_modules/@rawsql-ts/testkit-postgres/dist/client/PostgresTestkitClient.d.ts:17

#### Parameters

##### options

[`CreatePostgresTestkitClientOptions`](../interfaces/CreatePostgresTestkitClientOptions.md)&lt;`RowType`\&gt;

##### scopedRows?

[`TableRowsFixture`](../interfaces/TableRowsFixture.md)[]

##### context?

`ExecutionContext`&lt;`RowType`\&gt;

#### Returns

`PostgresTestkitClient`&lt;`RowType`\&gt;

## Methods

### query()

> **query**(`textOrConfig`, `values?`): `Promise`&lt;`CountableResult`\<`RowType`\&gt;\>

Defined in: node\_modules/.pnpm/@rawsql-ts+testkit-postgres@0.16.0/node\_modules/@rawsql-ts/testkit-postgres/dist/client/PostgresTestkitClient.d.ts:18

#### Parameters

##### textOrConfig

`string` \| [`PostgresQueryInput`](../interfaces/PostgresQueryInput.md)

##### values?

`unknown`[]

#### Returns

`Promise`&lt;`CountableResult`\<`RowType`\&gt;\>

***

### withFixtures()

> **withFixtures**(`fixtures`): `PostgresTestkitClient`&lt;`RowType`\&gt;

Defined in: node\_modules/.pnpm/@rawsql-ts+testkit-postgres@0.16.0/node\_modules/@rawsql-ts/testkit-postgres/dist/client/PostgresTestkitClient.d.ts:19

#### Parameters

##### fixtures

[`TableRowsFixture`](../interfaces/TableRowsFixture.md)[]

#### Returns

`PostgresTestkitClient`&lt;`RowType`\&gt;

***

### close()

> **close**(): `Promise`&lt;`void`\&gt;

Defined in: node\_modules/.pnpm/@rawsql-ts+testkit-postgres@0.16.0/node\_modules/@rawsql-ts/testkit-postgres/dist/client/PostgresTestkitClient.d.ts:20

#### Returns

`Promise`&lt;`void`\&gt;
</div>
