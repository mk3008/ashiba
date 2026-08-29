# Dependency Graph

```text
canonical SQL files
  ├─ model-gen / binding freshness ─────────────── retained Golden Path
  ├─ native driver / application tests ─────────── retained Golden Path
  └─ optional CLI analysis family
       ├─ query format ─────────────── formatting report / guarded write
       ├─ query lint ───────────────── advisory diagnostics
       │    └─ lint ────────────────── plus DDL-backed static checks
       ├─ query uses ───────────────── AST-first table/column report
       │    ├─ query catalog discovery
       │    └─ strict AST parsing by default
       ├─ query outline / graph ────── CTE/table explanation
       └─ query slice ──────────────── debug SQL transformation
```

There is no edge from this optional family to deterministic binding metadata,
`bindNamedParameters`, native execution, PostgreSQL contract, or
application/live tests.

## Retained dependencies outside the candidate command family

```text
rawsql-ts SqlFormatter
  ├─ optional query format             candidate REMOVE
  ├─ optional query lint / slice       candidate REMOVE
  ├─ DDL schema model processing       retained independently
  └─ result-column processing          retained independently

normalizeSqlSource
  └─ model-gen source hash             newline normalization only
```

Thus the evaluation does not infer that an optional-command decision removes
the parser/formatter library or alters generated binding freshness. The
follow-up boundary is the optional command and its command-specific helpers,
not retained compiler/contract functionality.
