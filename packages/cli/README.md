# @ashiba-ts/cli

SQL-first scaffold and verification CLI for TypeScript applications.

This is Ashiba's development-time CLI. It generates and checks facts about
canonical SQL; it is not in an application's runtime execution path.

For a small application, the baseline runtime path is:

```text
canonical SQL → build-time lowering/metadata → separate values → native driver
```

Keep application-owned pool, transaction, and business semantics at the native
driver boundary. Ashiba driver adapters and testkit packages are optional
compatibility/testing surfaces, not prerequisites for that path.

The repository README and command API are extended references, not required
starting points:

- [Ashiba README](https://github.com/mk3008/ashiba#readme)
- [Command API](https://mk3008.github.io/ashiba/generated/api/commands)

## Quick Commands

```bash
ashiba --help
ashiba --version
ashiba init --db postgres --driver pg --with-demo-ddl
ashiba feature scaffold users-list --table users --action list
ashiba feature import users-search search --sql tmp/search-users.sql
ASHIBA_POSTGRES_DATABASE_URL=postgresql://localhost/app \
  ashiba feature query postgres-contract users-search search
ASHIBA_POSTGRES_DATABASE_URL=postgresql://localhost/app \
  ashiba sql-resource snapshot --out generated/schema-before.json
ashiba sql-resource compare --before generated/schema-before.json --after generated/schema-after.json
ashiba check
```

## What This Package Owns

The CLI owns development-time scaffolding, query analysis, DDL review, model
generation, contract checks, RFBA inspection, sqlgrep-style query tools, and
performance evidence.

Generated application code is expected to be editable and free of an ORM runtime or hidden query DSL. The CLI generator is not in the runtime path. Native database drivers are the runtime execution baseline; an application may opt into Ashiba preparation or an Ashiba adapter as a compatibility/convenience seam. The CLI may generate query model metadata such as source hashes, statement shape, named-parameter binding metadata, result contracts, safe-sort insertion positions, optional-condition compression ranges, and sortable dictionaries so those optional surfaces can avoid runtime AST parsing.

Performance scenario commands are manual traditional DB-backed tuning aids. They record target row counts, response-time requirements, timeout status, timing evidence, and index adoption guidance; they do not choose or adopt indexes.

Root compound queries such as `UNION`, `INTERSECT`, and `EXCEPT` are represented as metadata and should be rejected for safe sort unless the SQL author wraps them in an explicit subquery with stable sortable columns.

## Optional PostgreSQL-derived contracts

`feature query postgres-contract` asks a development PostgreSQL database to
prepare—but not execute—the canonical query. It writes
`generated/postgres.contract.json` beside the query and embeds the validated
contract in `generated/query.meta.ts`.

The contract keeps PostgreSQL OIDs, base/array/enum/domain identities, and
parameter/result positions separate from node-postgres value representations.
Nullability remains `inferred` or `unknown` because prepared-statement result
type metadata does not generally prove it. JSON/JSONB maps to `unknown`: the
driver parses a JSON value, but neither PostgreSQL nor Ashiba has proved the
application object shape.

The default profile records normal node-postgres parsers. If the application
installs custom type parsers, generate with `--driver-profile custom:<stable-id>`
and pass the same profile to the runtime adapter. Custom profiles deliberately
degrade driver value types to `unknown`; Ashiba does not own parser
configuration. Use a development/test database, not production. See the
[PostgreSQL-derived query contract guide](https://mk3008.github.io/ashiba/guide/postgres-contract).

## SQL resource fleets

`sql-resource snapshot` projects canonical VSA-local `.sql` files into
language-neutral resource JSON plus separate executable PostgreSQL SQL. The
metadata points to the canonical SQL rather than embedding its body. It carries
OID-free recursive database type identity, driver representation, capabilities,
dependency evidence, and provenance so consumers do not need TypeScript or an
Ashiba runtime.

`sql-resource compare` compares before/after snapshots and emits a compact
fleet summary with only affected query IDs and reasons by default. It separates
compatible drift, contract change, PostgreSQL prepare failure, and evidence
that needs review. This is a development/check workflow; it never applies a
migration. See the
[SQL resource compatibility guide](https://mk3008.github.io/ashiba/guide/sql-resource-compatibility).
