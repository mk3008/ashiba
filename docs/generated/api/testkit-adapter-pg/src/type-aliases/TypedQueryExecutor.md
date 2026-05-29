<div v-pre>
# Type Alias: TypedQueryExecutor&lt;RowType\&gt;

> **TypedQueryExecutor**&lt;`RowType`\&gt; = (`sql`, `params`) => `Promise`&lt;[`QueryExecutionResult`](QueryExecutionResult.md) \| `RowType`[]\&gt;

Defined in: node\_modules/.pnpm/@rawsql-ts+testkit-postgres@0.16.0/node\_modules/@rawsql-ts/testkit-postgres/dist/types.d.ts:25

Typed variant of `QueryExecutor` that preserves the caller-provided row shape.

## Type Parameters

### RowType

`RowType` *extends* [`Row`](Row.md) = [`Row`](Row.md)

The concrete shape of rows returned by the executor.

## Parameters

### sql

`string`

SQL to execute.

### params

readonly `unknown`[]

Parameters supplied to the SQL statement.

## Returns

`Promise`&lt;[`QueryExecutionResult`](QueryExecutionResult.md) \| `RowType`[]\&gt;

Resolved rows typed as `RowType[]`, or `{ rows, rowCount }`.
</div>
