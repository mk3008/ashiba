# CTE Shadowing for Scenario-Oriented SQL Logic Tests

## Question

When fixture data itself defines each SQL-logic scenario, does statement-local
rawsql-ts CTE shadowing materially outperform a conventional transaction with
batched physical fixture inserts and rollback? This is not a re-evaluation of
the Stage 1–3 mapping-test decision.

## Why mapping tests and logic tests differ

Mapping tests can share a small, stable physical seed because fixture values
rarely express business meaning. Here every scenario varies eligibility state:
an open and paid order can win; insufficient inventory, a blocked customer, an
unpaid order, or a shipment can make an otherwise similar order ineligible.
Each query asserts the expected selected order or no result. A shared seed is
therefore not the primary comparison.

## Compared fixture models

| Model | Per-scenario path |
| --- | --- |
| Conventional physical | acquire pool client → `BEGIN` → batched INSERT per referenced relation → canonical query → assertion → `ROLLBACK` → release |
| rawsql-ts CTE | base public testkit client → `withFixtures(scenarioRows)` → canonical query → Ashiba bind → AST rewrite → real `pg` → assertion |

The physical arm uses a warm PostgreSQL database and batched inserts. It does
not recreate a container, migrate, or create/drop a schema per scenario.

## SQL logic scenarios

The evaluation-only order-eligibility domain has customers, warehouses, orders,
items, inventory, product rules, payments, and shipments. The query family
includes filter/classification, joins, `EXISTS`, `NOT EXISTS`, aggregate / `GROUP
BY` / `HAVING`, and priority ordering. Each scale's query actually uses every
relation supplied at that scale; no unused fixture relations are added to inflate
payload size.

## Environment

- Windows (`win32`), Node `v22.14.0`, disposable PostgreSQL 16, real `pg`.
- `pg.Pool({ max: 8 })`; three warm samples per matrix cell.
- rawsql-ts `@rawsql-ts/testkit-postgres@0.16.9`, public
  `createPostgresTestkitClient(...).withFixtures(...)`, generated-format
  metadata, and normal query execution. No private cache or Ashiba wrapper.
- Ashiba named-parameter compile/bind runs before both arms execute canonical
  SQL. Container startup and schema reset are excluded from scenario wall time.

## Fixture scale matrix

| Scale | Relations | Rows | Fixture input bytes | Canonical SQL bytes | Logic focus |
| --- | ---: | ---: | ---: | ---: | --- |
| S | 1 | 3 | 392 | 157 | status/priority classification and ordering |
| M | 2 | 10 | 997 | 250 | order plus paid-payment `EXISTS` |
| L | 4 | 30 | 3,115 | 464 | customer/item/inventory joins and aggregate `HAVING` |
| XL | 8 | 99 | 9,480 | 831 | eligibility family with joins, `EXISTS`, `NOT EXISTS`, aggregate, and priority |

## Scenario-count / concurrency matrix

Scenario counts are 10, 50, and 100; requested shared-pool concurrency is 1,
4, and 8. The following 100-scenario wall-time medians show the primary matrix
in milliseconds.

| Scale | Physical c1 / c4 / c8 | rawsql-ts CTE c1 / c4 / c8 |
| --- | --- | --- |
| S | 256.29 / 71.44 / 48.57 | 155.21 / 80.70 / 71.10 |
| M | 296.71 / 99.72 / 48.80 | 193.45 / 117.25 / 119.86 |
| L | 513.97 / 128.27 / 92.33 | 488.54 / 270.74 / 315.19 |
| XL | 1,083.12 / 339.26 / 233.41 | 1,730.00 / 1,192.23 / 1,184.09 |

## Physical fixture setup cost

At 100 scenarios / concurrency 8, physical fixture insert / query execution /
rollback accumulated respectively (milliseconds): S 101.45 / 93.17 / 88.63; M
155.31 / 81.59 / 69.54; L 407.87 / 131.71 / 85.78; XL 869.41 / 776.18 / 101.05.
Those cumulative values overlap in the wall time under concurrency; they expose
the expected growth of batched writes without treating it as serialized work.

## CTE rewrite / SQL size cost

At 100 scenarios / concurrency 8, CTE `withFixtures` plus rewrite/query time
accumulated 536.66 ms (S), 907.85 ms (M), 2,397.69 ms (L), and 9,113.56 ms
(XL). Executor DB time was 487.63, 812.31, 2,117.87, and 7,975.99 ms. Generated
CTE SQL totaled 79,845, 192,150, 579,525, and 1,705,285 bytes respectively—an
approximate per-scenario SQL payload of 798, 1,922, 5,795, and 17,053 bytes.

A five-run XL API probe found median 20.68 ms for the intended base-client plus
`withFixtures` path and 21.40 ms for a fresh client with `tableRows`. The small
local difference is not a performance adoption result; the
matrix uses `withFixtures` because it is the explicit public layering path.

## Correctness and isolation

All scenario logic assertions passed and cross-scenario contamination was zero.
Each result had to contain its own unique token and expected winning order, or
no row when fixture state was ineligible. Complete CTE fixtures required no
physical fixture transaction, cleanup, lock, schema, or table isolation.

## Performance results

Best wall time across concurrency for each count/scale, in milliseconds:

| Scale | 10: physical / CTE | 50: physical / CTE | 100: physical / CTE |
| --- | --- | --- | --- |
| S | 8.10 / 9.28 | 34.47 / 45.31 | 48.57 / 71.10 |
| M | 8.51 / 13.68 | 31.22 / 74.33 | 48.80 / 117.25 |
| L | 11.67 / 30.25 | 47.84 / 140.22 | 92.33 / 270.74 |
| XL | 30.91 / 123.94 | 110.51 / 596.65 | 233.41 / 1,184.09 |

CTE showed serial wall-time advantages at S/M/L in parts of the measured
matrix, where it avoids physical writes and rollback. Those advantages
disappeared under useful pool concurrency and reversed at XL. Across the
best-concurrency comparison, physical transaction + batched fixtures were
faster at every measured scale. This is not a sufficient total-cost or adoption
result.

## Scaling behavior

Fixture size materially changes the economics, but against CTE shadowing in
this environment. Physical batched insert cost grows with rows and relations;
so do CTE construction, AST rewrite, generated SQL bytes, and PostgreSQL parse/
plan/execution. The 8-relation / 99-row XL CTE payload is about 22× the S CTE
payload per scenario and is substantially slower at every measured concurrency.

Concurrency materially changes wall time: physical fixtures scale strongly to
8 in this pool, while CTE does not gain enough to offset its growing SQL work.
This is an observation for PostgreSQL 16 / local pool max 8, not a universal
throughput model.

## Break-even

**Not found.** No fixture scale, scenario count through 100, or concurrency
level 1/4/8 produced a robust CTE wall-time advantage over the conventional
physical baseline. Serial S/M/L advantages in parts of the matrix are not
robust across useful concurrency, and performance reverses at XL.

## Safety limitations

The Stage 2/3 released-library behavior persists. A complete XL CTE fixture
returned priority 20 while a physical sentinel with the same token had priority
77, proving fixture precedence. With intentionally empty fixtures and
`missingFixtureStrategy: 'error'`, the query instead returned physical priority
77. Stage 4 adds no wrapper to conceal that physical fallback.
Generated-manifest freshness and its known nullability blind spot remain
inherited ownership costs.

## Interpretation

**Stage 4 classification: `logic-test-isolation-only`.** Scenario-oriented SQL
logic fixtures are a more natural use of statement-local state than DTO mapping
fixtures, and their isolation is genuinely simpler. The measured public
rawsql-ts path does not earn its parser/testkit, safety, and SQL-size costs with
performance: physical batched transactions are faster at the best shared-pool
settings for every tested scale.

## General recommendation

CTE shadowing is an external/adjacent technique that can simplify complete
scenario fixture isolation. It is not Ashiba's default mapping-test path, and
this evidence does not justify an Ashiba dependency, API, CLI, helper, Skill,
or Scope change.

## Limitations

This is a local warm PostgreSQL measurement with one realistic query family,
three samples, up to 8 relations / 99 rows / 100 scenarios, and pool max 8. It
does not measure remote network latency, other DB engines, larger production
corpora, or an improved rawsql-ts release. Reopen this evaluation only if
implementation cost or fail-closed safety materially improves, the DB/
environment changes substantially, or a real production corpus contradicts the
measured break-even.
