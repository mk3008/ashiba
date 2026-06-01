# @ashiba-ts/cli

Ashiba Runtime Zero SQL scaffolder for TypeScript applications.

This is the development-time CLI for Ashiba. It is normally used together with
an Ashiba driver adapter and testkit package, not as a standalone library.

Start with the repository README for the full SQL-first workflow:

- [Ashiba README](https://github.com/mk3008/ashiba#readme)
- [Command API](https://mk3008.github.io/ashiba/generated/api/commands)

## Quick Commands

```bash
ashiba --help
ashiba --version
ashiba init --db postgres --driver pg --with-demo-ddl
ashiba feature scaffold users-list --table users --action list
ashiba check
```

## What This Package Owns

The CLI owns development-time scaffolding, query analysis, DDL review, model
generation, contract checks, RFBA inspection, sqlgrep-style query tools, and
performance evidence.

Generated application code is expected to be editable and runtime-zero except for the application-selected DB driver. The CLI may generate query model metadata such as source hashes, statement shape, named-parameter binding metadata, result contracts, safe-sort insertion positions, and sortable dictionaries so driver adapters can avoid runtime AST parsing.

Performance scenario commands are manual traditional DB-backed tuning aids. They record target row counts, response-time requirements, timeout status, timing evidence, and index adoption guidance; they do not choose or adopt indexes.

Root compound queries such as `UNION`, `INTERSECT`, and `EXCEPT` are represented as metadata and should be rejected for safe sort unless the SQL author wraps them in an explicit subquery with stable sortable columns.
