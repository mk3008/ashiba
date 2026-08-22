<!-- Generated from results.json by generate-transaction-concurrency-failures.mjs. Do not hand edit. -->
# Transaction and concurrency failure ledger

This ledger is a view of the 30 scored cells in [results.json](./results.json). `Live` is the independent PostgreSQL behavioral oracle; `Treatment` is workflow fidelity; `Strict` combines them as defined in that JSON file. The runner-owned record hash in the final column identifies the raw record captured before durable summarization.

| Arm | Run | Live | Treatment | Strict | Primary failure | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| A | A-T1-r2 | P | pass | P | No failure | runner-owned; 9a57d6a64316 |
| A | A-T1-r3 | P | fail | F | submitted boundary invokes psql directly, not the Minimum Ashiba workflow | runner-owned; 71bbc84cbe72 |
| A | A-T2-r1 | F | fail | F | concurrent-claim oracle mismatch | runner-owned; b77db689a4c6 |
| A | A-T2-r2 | P | fail | F | submitted boundary invokes psql directly, not the Minimum Ashiba workflow | runner-owned; 0c5790e5e0b5 |
| D | D-T1-r2 | F | pass | F | required oracle incomplete | runner-owned; 1a0699a20473 |
| D | D-T1-r3 | F | fail | F | success invocation failed: psql invalid command | runner-owned; cc3884d44553 |
| D | D-T2-r1 | P | pass | P | No failure | runner-owned; 491ae416769d |
| D | D-T2-r2 | P | fail | F | submitted boundary uses node-postgres directly, not Drizzle | runner-owned; 3eeae6fae6c3 |
| K | K-T1-r2 | F | pass | F | success transfer oracle mismatch | runner-owned; 21510a4f0ba8 |
| K | K-T1-r3 | F | fail | F | success invocation failed: module pg not found | runner-owned; 3185835c5e6c |
| K | K-T2-r1 | P | fail | F | submitted boundary uses node-postgres directly, not Kysely | runner-owned; b4e5cad916de |
| K | K-T2-r2 | F | fail | F | post-update rollback oracle mismatch | runner-owned; 19418ce4d63f |
| P | P-T1-r3 | P | fail | F | submitted boundary uses node-postgres directly, not Prisma 8 RC | runner-owned; f33b2f73f03c |
| P | P-T1-r4 | P | fail | F | submitted boundary uses node-postgres directly, not Prisma 8 RC | runner-owned; dc1bee65c973 |
| P | P-T2-r1 | F | fail | F | concurrent-claim oracle mismatch | runner-owned; 5f915c1dd537 |
| P | P-T2-r2 | F | fail | F | concurrent-claim oracle mismatch | runner-owned; 0569025131aa |
| S | S-T1-r2 | U | unknown | U | no submitted transfer.mjs or other documented callable boundary | runner-owned; f5950950975a |
| S | S-T1-r3 | P | fail | F | submitted boundary uses node-postgres directly, not sqlc TypeScript/Node | runner-owned; bec642f9d61a |
| S | S-T2-r2 | P | fail | F | submitted boundary uses node-postgres directly, not sqlc TypeScript/Node | runner-owned; e90a45651af6 |
| S | S-T2-r3 | F | fail | F | concurrent-claim oracle mismatch | runner-owned; 174f5324a921 |
| A | A-W5-r1 | P | pass | P | No failure | runner-owned; 9691bc60bcdb |
| A | A-W5-r2 | P | pass | P | No failure | runner-owned; 43ffe8df8b09 |
| D | D-W5-r1 | P | pass | P | No failure | runner-owned; 8c00d27d126b |
| D | D-W5-r2 | P | pass | P | No failure | runner-owned; b861352e136f |
| K | K-W5-r1 | P | pass | P | No failure | runner-owned; 3b932439f138 |
| K | K-W5-r2 | P | pass | F | runner entrypoint JSON serialization rejected BigInt | runner-owned; 4bca5b972868 |
| P | P-W5-r1 | P | pass | P | No failure | runner-owned; eb46e9038832 |
| P | P-W5-r2 | P | pass | P | No failure | runner-owned; 424c8cbeab1c |
| S | S-W5-r1 | P | pass | P | No failure | runner-owned; 5a77dfba50fa |
| S | S-W5-r2 | P | pass | P | No failure | runner-owned; 826e67c6d8ee |

## Machine-derived result aggregates

The following counts are calculated directly from results.json; they are not an independently maintained report table. Run node summarize-results.mjs for the same data in JSON form and its structural assertions. The all-workloads row is bookkeeping only, not a benchmark score.

| Workload | Cells | Strict P | Strict F | Strict U | Live P | Live F | Live U |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| T1 | 10 | 1 | 8 | 1 | 5 | 4 | 1 |
| T2 | 10 | 1 | 9 | 0 | 5 | 5 | 0 |
| W5 | 10 | 9 | 1 | 0 | 10 | 0 | 0 |
| All workloads (bookkeeping only) | 30 | 11 | 18 | 1 | 20 | 9 | 1 |

## Primary failure-class matrix

The matrix classifies one primary outcome per cell. A behavioral failure can coexist with a treatment mismatch; the per-cell table retains both axes. `unknown/insufficient` is reserved for a scored result whose first failure cannot be placed in a more specific class (there are none in this capture).

| Failure class | A | Prisma | sqlc | Drizzle | Kysely | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| PostgreSQL behavior incorrect | 1 | 2 | 1 | 2 | 2 | 8 |
| no callable boundary | 0 | 0 | 1 | 0 | 0 | 1 |
| treatment fallback/bypass | 2 | 2 | 2 | 1 | 1 | 8 |
| dependency/setup | 0 | 0 | 0 | 0 | 1 | 1 |
| serialization/codec | 0 | 0 | 0 | 0 | 1 | 1 |
| unknown/insufficient | 0 | 0 | 0 | 0 | 0 | 0 |
| no primary failure recorded | 3 | 2 | 2 | 3 | 1 | 11 |
