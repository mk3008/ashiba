# Capability Ownership Ledger

| Capability | Current owner | Native/core alternative | Failure prevention | Decision |
| --- | --- | --- | --- | --- |
| named binding and missing/unused validation | all adapters | `@ashiba-ts/named-parameters` | rejects parameter-set mismatch | KEEP in named core; REMOVE from adapter ownership |
| driver placeholder preparation | adapters | generated binding metadata + native driver | preserves values separate from SQL | REMOVE from wrappers |
| runtime source hash gate | adapters | `model-gen --check`; small application comparison where runtime SQL is dynamic | rejects stale metadata before execution | REDUCE; no public package evidence |
| observer, masking, elapsed/row event | adapters/core | application logger/telemetry boundary | visibility only; not SQL safety | REMOVE from Ashiba adapter ownership |
| retry helper / PG transient classifier | core/pg | application retry policy and driver error handling | classifies candidates, not retry safety | REMOVE; Scope assigns retries to applications |
| feature executor / cardinality helpers | core | ordinary application functions | cardinality assertion | REMOVE; application architecture/DTO boundary |
| typed query source / feature query model | core | application-owned TypeScript types | compile-time convenience | REMOVE except narrowly required metadata contract types |
| safe sort finite rendering | core/pg | application finite map and tests | rejects unknown/stale adapter metadata | REDUCE; prior ablation = Rule Only |
| optional-condition compression | pg + generated metadata | retained nullable guards or application mechanism | rejects stale coordinates before pg execution | KEEP OPTIONAL / productization pending |
| PostgreSQL driver profile/contract check | core/pg | standalone PostgreSQL contract | detects profile/source mismatch | KEEP OPTIONAL outside adapter package |

No capability above transfers transaction, pool, lifecycle, business ordering, semantic query correctness, or retry safety to Ashiba. Those remain application responsibilities.
