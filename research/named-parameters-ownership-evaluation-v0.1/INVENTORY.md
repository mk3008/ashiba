# Inventory

The package owns only lexical named-marker recognition, deterministic rendering metadata, and strict object-to-values binding. It has no dependency on `rawsql-ts`, no SQL AST/parser dependency, and no runtime dependencies. It owns no schema, semantic SQL analysis, result mapping, query construction, connection/pool/transaction ownership, SQL loading, generated artifacts, migration, or DB execution.

Current source is 82 production lines (`compiler.ts` 50, `index.ts` 32), 96 test lines, two root exports plus a compiler subpath, and zero production dependencies. Compilation scans once per statement and can be cached at initialization/build time; binding maps precomputed names once per execution.

Baseline after pinned dependency setup: build PASS, typecheck PASS, tests 8/8 PASS. The initial unavailable-tool result was an unprepared worktree, not a package failure.
