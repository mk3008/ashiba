<p align="center">
  <img src="docs/public/brand/ashiba-readme-hero.png" alt="Ashiba - Show me the SQL. Ashiba handles the boring parts." width="900">
</p>

# Ashiba

Ashiba is a SQL-first generator for TypeScript applications.

Write real SQL. Keep it in your repo. Ashiba generates the TypeScript DTOs, query contracts, mapper code, tests, metadata, and drift checks around it so the boring parts stay boring.

Ashiba is not an ORM package. It does not hide SQL behind a runtime abstraction. It helps you keep SQL as application-owned source code while making the TypeScript side reviewable, typed, and checked.

## Concept

**SQL is yours.**
Ashiba starts from plain SQL files your team can read, run in a SQL client, review, tune, and change. No query DSL. No hidden generated SQL language.

**Generated code is yours.**
Ashiba writes ordinary TypeScript into your repository. DTOs, query contracts, metadata, mapper boundaries, and tests are visible files. You can read them, edit them, review them, and let checks tell you when they drift.

**Boilerplate is generated.**
You keep the database behavior in SQL. Ashiba fills in the TypeScript connective tissue around it: DTO shapes, query contracts, mapper boundaries, generated metadata, and starter tests.

**Safety is checked, not hidden.**
Ashiba does not depend on a heavy runtime validator to rescue stale code. It leans on generated tests, contract checks, query metadata guards, SQL lint, DDL drift detection, and migration review artifacts.

Keep the SQL. Drop the boilerplate. Test the contract. Grow the code.

## Getting Started

Start inside your TypeScript project and install the PostgreSQL path:

```bash
npm install @ashiba/driver-adapter-pg pg
npm install -D @ashiba/cli @ashiba/testkit-adapter-pg @types/pg typescript vitest dotenv
```

Create the starter files:

```bash
npx ashiba init --db postgres --driver pg --with-demo-ddl --with-migration-demo-ddl
```

Run the demo path:

```bash
cp .env.example .env
docker compose up -d

npx ashiba feature scaffold --feature-name users-list --table users --action list
npm test

npx ashiba ddl migration generate \
  --from tmp/ddl/production.sql \
  --to db/ddl/public.sql \
  --out tmp/ddl/migration.sql
```

That path gives you the shape of Ashiba in a few minutes: visible DDL, visible SQL, generated TypeScript contracts, mapper-test scaffolds, and reviewable migration SQL.

Notes:

- `ashiba init` creates starter files, not `package.json`; package ownership stays with the application.
- The PostgreSQL starter uses Docker Compose for the DB-backed test lane.
- If port `5432` is busy, change `ASHIBA_TEST_DB_PORT` in `.env`.
- Demo DDL is opt-in. Omit `--with-demo-ddl` and `--with-migration-demo-ddl` for a blank project shape.

## Supported DBMS And Drivers

Ashiba chooses DBMS and wrapped driver explicitly. PostgreSQL is the most complete path today; MySQL and SQL Server already have driver adapters, with starter/testkit coverage still catching up.

| DBMS | Wrapped driver/tool | Package | Maturity |
|---|---|---|---|
| PostgreSQL | `pg` | `@ashiba/driver-adapter-pg` | Most complete: starter, generated query metadata, mapper-test lane, named-parameter binding, safe sort, SSSQL metadata, and customer tutorial path. |
| PostgreSQL | `pg` testkit | `@ashiba/testkit-adapter-pg` | ZTD mapper-test adapter used by the PostgreSQL starter. |
| PostgreSQL | `pg_dump` | `@ashiba/ddl-pull-pg-dump` | Optional helper for comparing production DDL from `pg_dump` with local DDL. |
| MySQL | `mysql2` | `@ashiba/driver-adapter-mysql2` | Driver adapter exists; full `ashiba init` starter and testkit path are not complete yet. |
| SQL Server | `mssql` | `@ashiba/driver-adapter-mssql` | Driver adapter exists; full `ashiba init` starter and testkit path are not complete yet. |

## Common Workflows

### Add A Feature

Use `ashiba feature scaffold` when a DDL table already exists and you want a reviewable feature boundary. Ashiba keeps SQL, query contracts, generated metadata, and mapper tests close to the behavior being reviewed.

### Change SQL

Edit the `.sql` file directly. Then run `ashiba feature query refresh` and `ashiba project check` so stale generated metadata or query contracts are caught before the change becomes accepted code.

### Change DDL

Edit DDL as source code. Then run `ashiba project check` for passive drift signals and `ashiba ddl migration generate --from-dir <old-ddl> --to-dir <new-ddl>` when the DDL is split by table or folder. Ashiba can warn when INSERTs silently rely on defaults or NULLs, and fail when required insert ownership is missing.

### Deploy A Migration

Ashiba generates migration SQL and risk information. Your application or operator process still owns DB connection, migration apply, rollback policy, and deployment timing.

### Tune A Query

Use query inspection commands to understand the SQL, then use performance scenarios to record representative row counts, timing evidence, timeout policy, and accepted index decisions. Candidate indexes stay sandbox-only until promoted into DDL.

## Commands

Run `ashiba --help`, `ashiba <command> --help`, or `ashiba describe command --format json` for details.

| Command | Role |
|---|---|
| `ashiba init` | Create a SQL-first starter after choosing DBMS and driver. |
| `ashiba feature scaffold` | Generate a feature boundary from DDL: SQL, DTO contracts, query boundary, metadata, and mapper tests. |
| `ashiba feature query scaffold` | Add another query boundary to an existing feature. |
| `ashiba feature query refresh` | Refresh generated query metadata after SQL-only edits. |
| `ashiba feature tests scaffold` | Add generated mapper-test cases and human-owned test placeholders. |
| `ashiba feature tests check` | Detect generated mapping-test drift. |
| `ashiba feature generated-mapper check` | Check visible SQL parameters, DDL-backed parameter types, and result columns against editable query contracts. |
| `ashiba check-contract` | Check visible SQL contracts and generated query metadata before commit or release. |
| `ashiba project check` | Aggregate passive checks for DDL, SQL lint, contract drift, generated feature assets, and INSERT ownership warnings. |
| `ashiba ddl migration generate` | Compare DDL files or DDL directories and emit one reviewable migration SQL file plus risk information. |
| `ashiba lint` | Run SQL lint and DDL-aware checks over files or directories. |
| `ashiba query outline` / `graph` / `slice` | Inspect, visualize, and debug complex SQL while keeping it runnable. |
| `ashiba query uses table` / `uses column` | Find SQL assets that reference schema objects. |
| `ashiba query sssql add` / `refresh` / `remove` | Maintain SQL-first optional-condition metadata. |
| `ashiba model-gen` | Generate editable query contracts and generated query metadata from a SQL file. |
| `ashiba perf scenario init` / `measure` | Capture traditional DB-backed performance evidence without letting Ashiba own DB execution. |
| `ashiba rfba inspect` | Inspect review-first feature/query boundaries. |

## Configuration

Ashiba reads `ashiba.config.json`:

```json
{
  "$schema": "https://ashiba.dev/schema/ashiba-config.json",
  "featureRoot": "src/features",
  "sqlRoots": ["src/features"],
  "ddl": {
    "sourceDir": "db/ddl"
  },
  "sql": {
    "parameterStyle": "both"
  },
  "tests": {
    "mapperLane": "ztd",
    "performanceLane": "traditional"
  }
}
```

`featureRoot` is the generated feature/use case boundary root. `sqlRoots` is the passive SQL check surface; add shared SQL folders there when SQL lives outside features.

Print a starter config with:

```bash
ashiba config
```

## Further Reading

- [Concept overview](docs/concepts/index.md)
- [ConceptSpec source](docs/concepts/ashiba-concepts.md)
- [Concept map](docs/concepts/concept-map.md)
- [Package naming policy](docs/architecture/package-naming-policy.md)
- [Migration status](docs/migration/status.md)

## Development

Run the local acceptance gate:

```bash
pnpm verify
```

Useful narrower checks:

```bash
pnpm docs:build
pnpm verify:customer-tutorial
pnpm verify:customer-tutorial:docker
pnpm docs:dev
```

## License

MIT
