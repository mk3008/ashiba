---
title: SQL resources and schema compatibility
---

# SQL resources and schema compatibility

Ashiba treats each canonical `.sql` file as an authored, language-neutral
resource. TypeScript modules, PostgreSQL contracts, and fleet snapshots are
derived evidence. They can be deleted and regenerated; they are not alternate
query sources.

## Generate a fleet snapshot

Run the snapshot command only against a development or test database:

```bash
export ASHIBA_POSTGRES_DATABASE_URL=postgresql://localhost/application_test
npx ashiba sql-resource snapshot --out generated/schema-before.json
```

For each canonical query at
`src/features/<feature>/queries/<query>/<query>.sql`, Ashiba writes:

```text
generated/
  query.postgres.sql
  query.resource.json
```

`query.resource.json` contains a stable ID, canonical path and hash, ordered
parameter names, parser and subtractive-runtime capabilities, portable
PostgreSQL parameter/result contracts, driver representations, dependencies,
provenance, and the PostgreSQL server major used as evidence. It deliberately
does not contain the canonical SQL body. `query.postgres.sql` is a separate,
derived `$1`-parameterized file so any PostgreSQL client can use it without a
TypeScript compiler or Ashiba runtime.

If PostgreSQL can no longer prepare a query, the per-query JSON is overwritten
with `status: "error"` and the SQLSTATE/message. This prevents a consumer from
silently treating an older successful resource contract as current. The fleet
snapshot retains the same failure as comparison evidence.

The database contract excludes OIDs from comparison identity. OIDs remain in
the lower-level query-local PostgreSQL evidence because they are useful catalog
lookup keys in one cluster. Resource identity instead uses schema/name/kind,
recursive array element and domain base identity, enum values, domain
constraints, and relevant type modifiers. Human-readable `formattedName` is
retained for diagnostics but excluded from equality because PostgreSQL can
render it differently under different `search_path` settings.

## Compare before and after

Generate one snapshot before a schema change and one after applying the change
to disposable databases or environments:

```bash
npx ashiba sql-resource compare \
  --before generated/schema-before.json \
  --after generated/schema-after.json \
  --out generated/schema-compatibility.json
```

The default output contains fleet counts and affected query IDs with compact
machine-derived reasons. Use `--query <stable-id>` for one full detail or
`--details` for all details. The persisted `--out` report always contains the
deterministic full comparison.

Classifications are exclusive:

| Classification | Meaning |
|---|---|
| `unaffected` | SQL source and observed boundary/dependency contracts are unchanged. |
| `compatible` | PostgreSQL still prepares the SQL and a specific compatibility rule covers the observed change. |
| `contract-changed` | SQL still prepares, but a parameter, result, driver, nullability, or type identity contract changed incompatibly. |
| `execution-breaking` | A query described before can no longer be prepared after the schema change. |
| `needs-review` | Evidence changed, but Ashiba cannot safely determine compatibility, such as a view definition or domain constraint change. |

The comparison does not apply migrations. Migration tools remain responsible
for changing database state; Ashiba evaluates those changes against the real
SQL fleet.

## Standalone execution and tuning

A non-TypeScript consumer needs only generic JSON and SQL file handling plus a
PostgreSQL client:

1. Read `query.resource.json`.
2. Resolve `canonical.path` for the authored source or `executable.path` for the
   derived PostgreSQL statement.
3. Bind values using the generated style-specific parameter metadata.
4. Execute or `EXPLAIN` `query.postgres.sql`.
5. Check returned column names and driver values against `contract`.

For debugging or tuning, open the canonical `.sql` in `psql` or another SQL
tool, make the chosen edit in that same file, and regenerate the resource.
There is no builder representation to reverse engineer or synchronize.

## Evidence boundaries

- `PREPARE` and PostgreSQL catalogs prove parameter/result database types and
  whether the statement is currently preparable. Application statements are
  not executed during snapshot generation.
- A transaction-local temporary view can prove SELECT result names, type
  modifiers, and referenced relations/columns/functions. Unsupported SELECT
  shapes degrade to the existing offline evidence with a diagnostic.
- General result nullability is not exposed by stable prepared-statement
  metadata. Ashiba retains inferred/unknown result nullability and separately
  compares catalog-proven `NOT NULL` on referenced columns.
- A changed view definition or domain constraint is reported as
  `needs-review`; Ashiba does not pretend to prove semantic equivalence.
- A compatible database/driver boundary does not prove unchanged performance,
  collation behavior, function semantics, row cardinality, or application
  validation rules.

No query builder, runtime AST, migration apply path, MCP server, or application
runtime dependency is introduced by this workflow.
