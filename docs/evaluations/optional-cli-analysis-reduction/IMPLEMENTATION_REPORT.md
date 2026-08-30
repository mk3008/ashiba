# Optional CLI Analysis Surface Reduction — Implementation Report

## Scope and invariant

Starting point: `0607247823df6f8dccb2ff73eb67d8d8d6796b73`.

This applies the completed optional CLI analysis ownership decision. It does
not change the Golden Path:

```text
canonical SQL
→ deterministic binding metadata
→ bindNamedParameters
→ native driver
→ optional PostgreSQL contract
→ application/live tests
```

Scope, DBMS positioning, named binding, model generation, SQL-resource
ownership, migrations, and the standalone PostgreSQL contract are unchanged.

## Removed public commands

- `ashiba query format`
- `ashiba query lint`
- `ashiba query outline`
- `ashiba query graph`
- `ashiba query slice`

Their command registration, catalog entries, dedicated AST reporting modules,
and public command behavior were removed together. No compatibility alias,
warning-only command, or replacement framework was added.

The dedicated advisory analysis modules removed with this surface were query
lint, outline/graph structure reporting, slice reporting, and their shared
analysis helper. The CLI-level `--rules` option and DDL parameter-conflict
diagnostic were also removed: this retained lint boundary does not interpret
parameter semantics.

## Retained query uses

`ashiba query uses table` and `ashiba query uses column` remain AST-first,
repository-wide impact inspection commands. They retain deterministic catalog
discovery, AST evidence, confidence bands, unresolved-file reporting, and
low-confidence fallback information.

AST parse failure remains fail-closed by default. A caller must explicitly
pass `--allow-parser-fallback` to accept low-confidence table fallback output.
New focused regression tests cover normal table and column usage, the strict
parse-failure path, and explicit fallback behavior.

Query uses remains optional inspection tooling; it is not a Golden Path step
or a standard verification gate.

## Retained DDL-backed lint

`ashiba lint` now has one narrow responsibility: check visible SQL against an
explicit DDL model for mechanically decidable table/column reference failures
and obvious literal/DDL type mismatches. Its parser failure is still a
structured failure.

It no longer offers advisory maintainability, architecture, complexity,
dependency-cycle, templating, join-direction, or style diagnostics. It also
does not claim named-binding, parameter, or business-semantic correctness.
Focused tests cover missing table/column references and literal type mismatch.

## Formatter internals

The removed command was the public formatter workflow, not all formatter use.
`sql-format.ts` and `rawsql-ts` `SqlFormatter` consumers remain where retained
generation and DDL/result metadata need their existing lower-level formatting
options. No formatter library dependency was removed merely because the
optional command was removed.

## Documentation and migration

Current docs no longer promote the removed SQL format command. The concise
The removed-command migration material is historical evidence; current guidance is in release-readiness docs.
guide directs formatting, advisory review, outline/graph inspection, and
slicing to application-owned editor, general tooling, AI, AST tooling, or
native-database workflows. It identifies query uses and narrow DDL-backed lint
as the retained surface.

Historical changelog and evaluation references remain historical evidence.

## Dependency boundary after reduction

```text
retained query uses
  → SQL catalog discovery + AST table/column analysis + usage reporting

retained lint
  → explicit DDL model + AST table/column/literal checks

removed commands
  → no current Ashiba command dependency
```

This reduction does not add a generic analysis architecture.

## Verification

Completed verification is recorded in `raw-results.json`. It includes focused
query-uses and DDL-lint regression tests, CLI command/catalog checks, the
repository verification suite, docs build, and diff validation. The default
repository workflow covers the retained model-generation, named-parameter,
PostgreSQL-contract, Support Inbox, Ticket Queue, consumer-install, and
customer-functional paths; no execution/runtime code changed.

## Known limitation

Query uses reports structural impact, not SQL or business semantics. Explicit
fallback is intentionally lower confidence. DDL lint is narrow by design and
does not replace application/integration/live tests.
