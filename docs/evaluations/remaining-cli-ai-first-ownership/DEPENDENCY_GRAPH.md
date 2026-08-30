# Cross-command dependency graph

```text
config starter / ashiba.config.json
  ├─ project check ── compileNamedParameters over discovered SQL
  │    └─ check ── optional arbitrary test-command spawn
  ├─ lint ── DDL location + schema/search-path defaults
  └─ sql-resource snapshot ── feature-layout discovery

model-gen static artifact
  ├─ sourceHash / --check freshness
  ├─ postgres-contract result-column helper
  └─ sql-resource compiled SQL / result-column helper

canonical SQL + PostgreSQL
  ├─ postgres-contract artifact ── sourceHash contract check
  └─ sql-resource fleet snapshot ── sql-resource compare

query uses ── independent AST catalog discovery / analysis
```

The first chain is a second-scaffold pattern: a starter config establishes a
project convention, a project wrapper discovers files, and an outer wrapper
spawns a project-selected test command. The generated-state chains need
separate treatment: `model-gen` already has a REDUCE decision, while
PostgreSQL contract and SQL-resource artifacts need either generic re-homing or
focused evidence that the artifact itself is necessary.

`query uses` has no dependency on this configuration/generation chain. Its
main dependency is `rawsql-ts` parsing plus catalog discovery; that is why its
value and its scope fit must be judged independently.
