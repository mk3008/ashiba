# Arm Treatment and Fairness

| Arm | Treatment |
| --- | --- |
| A | Minimum Ashiba v1: canonical SQL and its installed workflow; do not add product capabilities. |
| P | Prisma 8 RC installed contract/data-layer workflow. |
| S | sqlc TypeScript/Node generation and query workflow. |
| D | Drizzle's normal ORM/query workflow. |
| K | Kysely's normal typed-query workflow. |

All arms receive the same business requirement, database, model/effort, permissions, timebox, and runner evaluator. A runner-owned adapter may bridge CLI/function shape differences, but must not repair a candidate, create its transaction, or synthesize SQL/EXPLAIN evidence.

## Treatment-fidelity audit status

The detailed boundary between each tool's normal workflow, an allowed escape
hatch, and a disallowed bypass was under-specified before T1/T2 execution.
Accordingly, this document records a **post-hoc evidence audit taxonomy**, not
a preregistered pass/fail rule. Live PostgreSQL behavior remains the primary
behavioral result for T1/T2. The audit may classify a retained submission as
`pass`, `fail`, or `unknown`; it cannot convert a live behavioral pass into
primary evidence of behavioral failure.

The durable result convention is three-axis: `live_postgresql_result` is the
runner-owned behavioral oracle, `treatment_fidelity` is this secondary audit,
and `strict_result` is the composite runner outcome. A strict P requires an
evaluable frozen public boundary, live P, and treatment pass. An evaluable
strict F has a live-or-fidelity (or other expressly frozen boundary assertion)
non-pass; strict U means the submitted boundary could not be evaluated without
changing candidate files. The per-arm audit policy, including evidence and any
unknowns, is in the committed `evidence/results.json` and its failure ledger.

## Post-hoc workflow-boundary audit

The following is an explicit audit rubric for interpreting retained evidence.
It was **not** a complete preregistered rule set for T1/T2; consequently it
must not be read as a new primary behavioral oracle or as a claim about what a
tool normally permits. “Allowed” means evidence compatible with the declared
arm for this secondary audit, not an endorsement of every normal escape hatch.

| Arm | Required workflow for a post-hoc `pass` | Compatible evidence / allowed escape hatch | Bypass classified `fail` in retained cells | Historical limit |
| --- | --- | --- | --- | --- |
| A — Minimum Ashiba | Callable boundary using canonical SQL through the installed Minimum Ashiba workflow. | A PostgreSQL adapter beneath compiled/generated Ashiba query execution is compatible. | Standalone `psql` that bypasses Ashiba. | Arbitrary direct `pg` transaction code was not preregistered. |
| P — Prisma | Declared Prisma 8 RC contract/data-layer workflow at the callable boundary. | Prisma emitted contract/data layer; a documented Prisma raw-query feature was not separately tested. | Direct `node-postgres`; a recovered Prisma 7.9.1 runtime where Prisma 8 RC was frozen. | `$queryRaw` and direct-driver transactions were not universally preregistered as allowed or forbidden. |
| S — sqlc | Generated TypeScript query use in the callable SQLC workflow. | Generated query combined with its normal PostgreSQL transaction boundary. | Direct `node-postgres` with no generated SQLC query use. | Exact generator/driver interface boundary was under-specified. |
| D — Drizzle | Drizzle query/transaction layer at the callable boundary. | Drizzle SQL/tagged-template use inside its own query or transaction surface. | Direct `node-postgres` replacing Drizzle. | Every Drizzle raw-SQL variation was not preregistered. |
| K — Kysely | Kysely query/transaction layer at the callable boundary. | Kysely `sql` tagged template inside Kysely query/transaction use. | Direct `node-postgres` replacing Kysely. | Driver access used only for connection lifecycle was not preregistered. |

The runner did not synthesize a transaction or query merely to obtain
treatment compliance. Where retained evidence cannot establish the connection
between the public boundary and declared workflow, the fidelity value is
`unknown`, not a reconstructed `pass`.

There are 20 transaction/concurrency cells: `5 arms x (T1 + T2) x 2 replicates`. W5 has `5 arms x 2 replicates = 10` cells. A third replicate is allowed only for a documented split. B1 is excluded: it is outside ordinary PostgreSQL-application scope and requires a separate builder benchmark.
