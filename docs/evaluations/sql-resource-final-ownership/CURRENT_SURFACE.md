# Current surface census

## Question and boundary

This is an ownership evaluation, not a product change. The question is whether
SQL-resource snapshot and compare need an Ashiba-owned persistent artifact
lifecycle after their semantic value has been separated from Builder Mapper core.

Builder Mapper remains visible SQL, named-parameter compilation and binding,
reviewed finite composition, and native-driver handoff. Neither command is
needed to execute that path.

## Snapshot

`sql-resource snapshot` discovers canonical feature queries under
`src/**/queries/<query>/<query>.sql`. For every query it compiles named
parameters, derives parser/result metadata, asks PostgreSQL for a contract, and
writes the following generated state:

```text
generated/query.postgres.sql
generated/query.resource.json
generated/sql-resource-fleet.snapshot.json
```

For a fleet of N queries that is normally **2N + 1** generated files. The fleet
entry stores stable ID, canonical path/bytes/source hash, status, resource path,
and a resource or error. A described resource stores canonical and executable
identities; ordered parameter names; parser capability; PostgreSQL server,
parameter/result/dependency facts; driver representations; provenance; and
diagnostics.

## Compare

`sql-resource compare` reads two persisted fleet JSON files. It compares fleet
membership, source identity, parameter/result count/name/type/modifier/
nullability/driver representation, dependency facts, driver profile,
PostgreSQL major, and prepare status. It emits `unaffected`, `compatible`,
`contract-changed`, `execution-breaking`, or `needs-review`, plus a compact
affected-query report.

Not every persisted field is compared: parser capability, diagnostics,
provenance, executable path, and executable source hash remain maintenance
surface despite not being comparison inputs.

## Consumers

| Consumer class | Current evidence |
| --- | --- |
| Application / package / example / dogfood | None found |
| CI / standard verify / release workflow | None found |
| Current documentation | `docs/guide/sql-resource-compatibility.md`, linked from the docs indexes |
| Tests | `packages/cli/tests/sql-resource.test.ts`, environment-gated `sql-resource.live.test.ts`, and the test consumer |
| Historical evidence | Evaluation reports only; not adoption |

The feature was introduced in `33f1cb0` (`feat: add portable SQL resource
compatibility`). Its current public registration is in
`packages/cli/src/commands/sql-resource.ts`, `packages/cli/src/index.ts`, and
`packages/cli/src/commands/command-catalog.ts`.

## Second-scaffold result

The persistent state is not a query source, but it creates per-query artifacts,
a fleet schema, refresh conventions, source-hash review noise, compatibility,
and agent education obligations. The current compare command requires exactly
that state. No current consumer demonstrated a time-shifted audit use case that
requires retaining it.
