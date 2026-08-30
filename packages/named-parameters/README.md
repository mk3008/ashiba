# @ashiba-ts/named-parameters

Small deterministic named-parameter compilation and binding for applications
that keep canonical SQL visible. It does not provide an ORM, query builder,
SQL loader, generated artifact workflow, or runtime SQL rewriting.

## Minimal native-driver path

Keep ordinary database-dialect SQL in a reviewable `.sql` file. Express
application values as meaningful named parameters (for example `:requestId`),
then compile the SQL at a controlled application initialization or build point.
The application may cache the returned prepared representation.

```ts
import { bindNamedParameters } from '@ashiba-ts/named-parameters';
import { compileNamedParameters } from '@ashiba-ts/named-parameters/compiler';

const prepared = compileNamedParameters(
  'select id, title from purchase_requests where id = :requestId',
);
// prepared.sql === 'select id, title from purchase_requests where id = $1'
// prepared.parameterNames === ['requestId']

const query = bindNamedParameters(prepared, { requestId });
await pool.query(query.sql, query.values);
```

`bindNamedParameters` rejects missing names and unexpected names by default,
before the native driver call. Values remain separate from SQL text; do not
interpolate, quote, or escape them into SQL syntax. Driver and pool lifecycle,
transactions, result mapping, and application behavior remain application
responsibilities.
