# Current ownership census

## Question and boundary

This evaluation asks whether Ashiba should durably own the `model-gen`
workflow—its CLI, committed binding artifacts, source hash, and freshness
contract—when AI commonly generates and changes application code. It does not
re-evaluate the named-parameter compiler or binder.

The evaluated current path is:

```text
canonical SQL → model-gen → binding metadata / freshness → bindNamedParameters → native driver
```

The Scope presently classifies deterministic named-parameter lowering, binding
metadata, source freshness, and missing/unused rejection as core. This is an
evaluation of evidence for that current decision; it makes no Scope change.

## Current implementation

`packages/cli/src/commands/model-gen.ts` reads normalized canonical SQL,
computes a SHA-256 source hash, and calls the public
`compileNamedParameters()` primitive for PostgreSQL (`$n`), mysql2 (`?`), and
MSSQL (`@name`). Its generated TypeScript module contains only `sourceHash`
and those three bindings. `--check` regenerates the exact file content in
memory and compares bytes with `--out`.

The runtime binder does not read the source hash. It uses a chosen binding's
parameter names to reject missing or unused values before native-driver
execution.

`model-gen.ts` also currently hosts `buildQueryResultColumnContracts()` and
`analyzeQueryModel()`, used by SQL-resource and standalone PostgreSQL-contract
commands. Those helpers are not generated-binding output and must be treated
as separate consumers in any later implementation proposal.

## Generated information by owner

| Information | Current source | Could be obtained directly | Runtime application need |
| --- | --- | --- | --- |
| PostgreSQL lowered SQL and parameter names | generated artifact | `compileNamedParameters()` | yes for pg execution |
| mysql2 lowering / occurrence names | generated artifact | compiler | only a mysql2 application |
| MSSQL named lowering / parameter names | generated artifact | compiler | only an MSSQL application |
| `sourceHash` | generator | local source hashing | no; freshness only |
| exact artifact contents / stale result | generator | local regeneration comparison | no; CI/review convention |
| CLI result fields / generated header | CLI | n/a | no |

## Consumers

| Classification | Evidence |
| --- | --- |
| Current references | VSA: eight artifacts and generator/check script; layered: four artifacts and generator/check scripts. |
| Current dogfood | Support Inbox imports seven committed artifacts; its migration status names the check workflow. |
| Current repository verification | consumer-install, customer-tutorial, and npm-distribution scripts invoke the command and check mode. No workflow YAML names it directly. |
| Primitive-only current precedent | `examples/postgres-ticket-queue-reference/scripts/generate.mjs` directly imports the compiler and creates an application-owned artifact without Ashiba freshness. |
| Detached experimental | Transfer has four artifacts but is not Golden Path retention evidence. |
| Test-only | model-gen unit tests and distribution/tutorial smoke paths. |

## Historical narrowing

The initial implementation (`b451b4d`) generated broad query-contract,
result-column, AST, safe-sort, and PostgreSQL metadata. Subsequent work added
and then removed scaffold, DTO/mapper, safe-sort, optional-condition, and
driver-runtime responsibilities. Current code is materially narrower: driver
lowering plus source-derived freshness. Relevant reductions include
`e20f1fc` (scaffold DTO/mapper removal) and `efd864f` (final driver surface
removal).

## Maintenance surface

Today Ashiba owns the CLI/API, three driver renderings, exact generated-module
format, check semantics, tests, command catalog, package/docs guidance,
reference generation scripts, consumer/distribution verification, and an agent
education convention. It also has a compatibility implication because
applications import generated modules. This surface is distinct from the
compiler/binder primitive and from separately retained SQL-resource and
PostgreSQL-contract helpers located in the same source file.
