# Competitive Benchmark v2 Follow-up Manifest

## Frozen identity

- Base: `origin/main` at `1cd226eee0e2b1199b11c975ac2d1c2b05eb3ea3`.
- Runtime: portable Node `v24.19.0`; Docker PostgreSQL 18 on host port 5432.
- Isolation: a new nonce schema per reference or comparative cell; no benchmark data is read from `public`.
- Candidate arms: A Minimum Ashiba v1; P Prisma 8 RC; S sqlc TypeScript/Node; D Drizzle; K Kysely.
- Intended packages: Ashiba workspace at the base commit; Prisma `@prisma/cli` 8.0.0-rc.7 and `@prisma/orm-postgres` 8.0.0-rc.4; sqlc 1.31.1 and sqlc-gen-typescript 0.1.3; Drizzle 0.45.2; Kysely 0.29.5; `pg` 8.23.0 where the tool uses node-postgres. The runnable harness records actual resolved versions for each cell.

## Fixed Fresh-Agent treatment

Every comparative cell uses `luna_worker` / `gpt-5.6-luna` / high effort, the same permissions, 45-minute timebox, portable Node, PostgreSQL fixture, workload body, and runner evaluator. Agents receive neither evaluator assertions nor another cell's outcome. The only arm-specific instruction is: “Use the installed tool according to its intended workflow.”

## Result terms

- **P**: a runner-owned adapter invokes the submitted public boundary and the independent PostgreSQL oracle passes.
- **F**: the boundary is invoked and an independent live assertion fails.
- **U**: no compatible submitted boundary can be evaluated without changing candidate files. It is a strict non-pass, not a tool-wide conclusion.

Candidate self-tests and run records are observational evidence only. They are never the primary pass oracle.
