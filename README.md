# Ashiba

> **Project status: archived.** Active product development has ended. This
> repository is retained because its evaluations, experiments, and design
> history are useful research evidence. The standalone successor for the Raw
> SQL guidance produced by this work is
> [mk3008/raw-sql-rules](https://github.com/mk3008/raw-sql-rules).

![Ashiba: Show me the SQL. Ashiba handles the boring parts.](docs/public/brand/ashiba-readme-hero.png)

Show me the SQL. Ashiba handles the boring parts.

Ashiba makes raw SQL practical for safe application development.

SQL stays visible and reviewable, and values stay separate from SQL syntax.
Ashiba owns only the small deterministic mechanisms that are better proven
mechanically than reconstructed by every application.

It is not an ORM, query builder, architecture framework, migration tool, or
test runner. The application owns SQL files, driver lifecycle, transactions,
result mapping, logging, migrations, and business tests.

## Current mechanical core

```text
visible canonical SQL
  → compileNamedParameters
  → bindNamedParameters
  → native driver
  → application/live tests
```

Install the package next to the native driver:

```bash
npm install pg @ashiba-ts/named-parameters
```

Compile canonical SQL at a controlled application initialization or build
point, and cache the returned prepared query there. The loading and caching
choice belongs to the application; Ashiba does not require a filesystem
layout or generated module.

```ts
import { bindNamedParameters } from '@ashiba-ts/named-parameters';
import { compileNamedParameters } from '@ashiba-ts/named-parameters/compiler';

const prepared = compileNamedParameters(
  'select id, subject from tickets where owner_id = :ownerId limit :limit',
);

const { sql, values } = bindNamedParameters(prepared, { ownerId, limit });
const result = await pool.query(sql, values);
```

`bindNamedParameters` rejects missing and unused names before the native driver
call. Values remain separate from SQL text and are never interpolated.

Optional filters and dynamic order are application concerns. A finite public
choice may select a reviewed, source-controlled SQL literal; unbounded external
text must never become SQL syntax. Pools, transactions, rollback, migrations,
and behavior proof remain application-owned.

## AI-first development

Keep the SQL visible and ask an AI coding agent to implement the application
using the named-parameter primitive and the native driver. An application may
use vertical slices, layers, or any other ordinary architecture. See [Get
Started with AI](docs/guide/ai-first-getting-started.md) and the [architecture
references](docs/guide/architecture-references.md).

## Supported DBMS positions

| DBMS | Position | Runtime boundary |
| --- | --- | --- |
| PostgreSQL / `pg` | PRIMARY | native driver |
| MySQL / `mysql2` | SUPPORTED-SECONDARY | native driver |
| SQL Server / `mssql` | SUPPORTED-SECONDARY | native driver |

The binding package renders each driver's supported placeholder style. Feature
parity is not promised across DBMSs.

Ashiba supports Node.js 22 and 24 LTS; Node 24 is recommended. Node 20 is EOL
and unsupported. Node 26 is not yet a formal support target while it is a
Current release.

Historical evaluations and removed tooling are retained in the documentation
archive as evidence, not as current product instructions. See the [scope
boundary](docs/design/ashiba-scope.md).
