# Golden Path Evaluation

## Status: `golden-path-ready-with-doc-drift`

The recommended PostgreSQL + `pg` path is deliberately small:

```text
canonical SQL -> deterministic build-time lowering and binding metadata
-> bindNamedParameters -> native pg query(sql, values)
-> optional PostgreSQL contract -> application/live tests
```

This is Candidate A. It preserves visible ordinary SQL, parameterized execution,
and application ownership of pools, transactions, ordering policy, and tests.
It requires no ORM, repository, unit of work, runtime SQL parser, SQL file
loader, Ashiba-only SQL syntax, or mandatory adapter.

The classification has two qualifications. Live PostgreSQL contract execution
could not be repeated in this run because Docker could not allocate a new
network and available containers were not safely reusable. Also, the root README
foregrounds the scaffold-heavy path and contains a command/API mismatch found in
the packaged CLI. These are documentation/product-surface observations, not a
reason to broaden the Golden Path.

## Required shape

| Concern | Owner / requirement |
| --- | --- |
| SQL | Application-owned visible `.sql`, with meaningful named parameters |
| Runtime | `@ashiba-ts/named-parameters` and application-owned native `pg` pool/client |
| Generated assets | Lowered SQL and binding metadata; regenerate after canonical SQL changes |
| Types | Application-owned TypeScript parameter/result types; default pg `bigint`/`numeric` representation is `string` |
| Transaction | Application-owned `BEGIN`/`COMMIT`/`ROLLBACK` around visible statements |
| Verification | Generated-binding freshness is must-have; PostgreSQL contract is useful where the type boundary matters; application/live tests retain behavior and rollback proof |

## Change loop

| Change | Observed repair path | Result |
| --- | --- | --- |
| Projection | Edit canonical SQL; regenerate lowered SQL/metadata; update application result type; run contract where valuable | clear, application-owned type edit remains |
| Parameter add/rename | Edit SQL; regenerate; update application parameter type; binding rejects missing/unused names | deterministic guard available |
| DDL type/nullability | Update DDL/type boundary; regenerate as applicable; run PostgreSQL contract | default pg bigint/numeric mismatch to `number` is rejected |
| Two-statement mutation | Keep two SQL files visible; use native transaction; test forced failure and rollback | no Ashiba transaction mechanism required |

## Mechanical verification boundary

| Classification | Surfaces |
| --- | --- |
| A. must-have deterministic guard | named lowering/binding; missing/unused parameter rejection; stale generated binding metadata |
| B. useful optional guard | PostgreSQL parameter/result contract; SQL lint; formatter; safe sort; optional compression |
| C. application/live responsibility | transaction rollback, business semantics, cardinality choice, migration application, logic tests |
| D. unnecessary for Golden Path | mapper tests, generated DTO check, ZTD/testkit, feature scaffold, driver adapter, repository/UoW, runtime parser |

## Recommendation

Recommend Candidate A. Candidate B remains a supported scaffold alternative,
not the initial standard. Candidate C is evaluation-only: it established package
discoverability but did not reach a working clean consumer without manual
dependency repair and encountered starter typecheck/test friction.
