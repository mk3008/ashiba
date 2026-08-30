# Ashiba

Show me the SQL. Ashiba handles the boring parts.

Ashiba keeps canonical SQL visible while providing deterministic build-time
named-parameter lowering and binding metadata. It does not prescribe an
application architecture, generate DTOs or mappers, or own query execution.

## PostgreSQL Golden Path

```text
canonical SQL
  → deterministic build-time lowering and binding metadata
  → bindNamedParameters
  → native pg
  → optional PostgreSQL contract
  → application/live tests
```

The application owns TypeScript types, connection pools, transactions,
rollback behavior, migrations, and business tests. Values stay separate from
SQL text until the native driver boundary.

## Start with visible SQL and an AI coding agent

Install the development CLI and the small runtime binder alongside the native
driver used by your application:

```bash
npm install pg @ashiba-ts/named-parameters
npm install -D @ashiba-ts/cli typescript
```

Write canonical SQL with meaningful named parameters:

```sql
select id, subject
from tickets
where owner_id = :ownerId
limit :limit;
```

Generate a committed binding artifact and check it whenever the SQL changes:

```bash
npx ashiba model-gen src/tickets/list.sql --out src/tickets/list.bindings.ts
npx ashiba model-gen src/tickets/list.sql --out src/tickets/list.bindings.ts --check
```

Bind separately and call the native driver directly:

```ts
import { bindNamedParameters } from '@ashiba-ts/named-parameters';
import { bindingMetadata } from './tickets/list.bindings.js';

const prepared = bindingMetadata.bindings.postgres;
const { sql, values } = bindNamedParameters(prepared, { ownerId, limit });
const result = await pool.query(sql, values);
```

`bindNamedParameters` rejects missing and unused parameter names. It does not
interpolate values into SQL.

For a five-minute AI-first path and a copyable project `AGENTS.md`, see
[Get Started with AI](docs/guide/ai-first-getting-started.md). Your agent can
discover the supported CLI surface with `npx ashiba describe command --format json`;
you do not need to memorize commands.

For an optional database-derived parameter/result proof, use a development
PostgreSQL database:

```bash
npx ashiba postgres-contract write src/tickets/list.sql --out tmp/list.contract.json
npx ashiba postgres-contract check src/tickets/list.sql --contract tmp/list.contract.json \
  --params-type-file src/tickets/types.ts --params-type ListParams \
  --result-type-file src/tickets/types.ts --result-type Ticket
```

See the [architecture references](docs/guide/architecture-references.md) for
the same canonical SQL / binding core in a minimal module, vertical slices, and
layers.

## Supported DBMS positions

| DBMS | Position | Runtime boundary | DB-derived contract |
| --- | --- | --- | --- |
| PostgreSQL / `pg` | PRIMARY | native driver | full optional contract |
| MySQL / `mysql2` | SUPPORTED-SECONDARY | native driver | no full DB-derived contract |
| SQL Server / `mssql` | SUPPORTED-SECONDARY | native driver | partial native metadata |

Feature and contract parity are not promised across DBMSs. Native drivers are
the supported execution boundary; optional PostgreSQL capabilities do not
replace application-owned execution architecture.

## Optional verification

The CLI also provides optional SQL linting, query impact inspection, and
resource comparison. Discover the exact current surface with:

```bash
npx ashiba describe command --format json
```

Ashiba supports Node.js 22 and 24 LTS; Node 24 is recommended. Node 20 is EOL
and unsupported. Node 26 is not yet a formal support target while it is a
Current release.

Ashiba does not prescribe application architecture; see the
[Scope](docs/design/ashiba-scope.md). Historical removal and migration evidence
lives in the documentation archive rather than the new-user path.
