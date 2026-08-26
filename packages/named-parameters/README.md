# @ashiba-ts/named-parameters

Small runtime binding for SQL that was already lowered at build time. It does
not parse canonical SQL or construct SQL syntax; it only maps precomputed
parameter names to an ordered value array for the native driver.

`@ashiba-ts/named-parameters/compiler` is the corresponding build-time
lowering entry point. It is intentionally separate from the runtime execution
path: canonical SQL is compiled before the application runs.

## Minimal native-driver path

Keep ordinary database-dialect SQL in a reviewable `.sql` file. Express
application values as meaningful named parameters (for example `:requestId`),
then lower the SQL during a build step. For PostgreSQL the default compiler
rendering produces indexed `$n` placeholders.

```ts
// build step: read canonical SQL and write the returned metadata into a
// generated application module. No application value is present here.
import { compileNamedParameters } from '@ashiba-ts/named-parameters/compiler';

const prepared = compileNamedParameters(
  'select id, title from purchase_requests where id = :requestId',
);
// prepared.sql === 'select id, title from purchase_requests where id = $1'
// prepared.parameterNames === ['requestId']
```

At runtime, bind the precomputed metadata and pass SQL and values separately to
the native driver. The binder never parses or rewrites SQL at runtime.

```ts
import { bindNamedParameters } from '@ashiba-ts/named-parameters';

const query = bindNamedParameters(prepared, { requestId });
await pool.query(query.sql, query.values);
```

Missing names and unexpected names are rejected by default. Do not interpolate,
quote, or escape values into SQL text. Driver/pool lifecycle, transactions, and
application behavior remain application-owned.
