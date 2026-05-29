<div v-pre>
# Type Alias: QueryExecutor

> **QueryExecutor** = (`sql`, `params`) => `Promise`&lt;[`QueryExecutionResult`](QueryExecutionResult.md)\&gt;

Defined in: node\_modules/.pnpm/@rawsql-ts+testkit-postgres@0.16.0/node\_modules/@rawsql-ts/testkit-postgres/dist/types.d.ts:17

Executes raw SQL with normalized arguments and returns the driver rows.

## Parameters

### sql

`string`

The SQL string to execute.

### params

readonly `unknown`[]

Parameter array aligned with the SQL placeholders.

## Returns

`Promise`&lt;[`QueryExecutionResult`](QueryExecutionResult.md)\&gt;

A promise resolving to normalized query execution output.
</div>
