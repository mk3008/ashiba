# CTE Shadowing Experiment Ledger

## Scope and baseline

Starting commit: `b432b4097f8bc8106160bb85ca5e9c26a9ee69a7` (the merge of the
distribution-surface PR). The baseline is the existing
`examples/postgres-ticket-queue-reference` suite-level physical schema and
seed setup, not a per-test container or migration recreation.

Baseline inventory measured from source: two physical relations, four canonical
queries, 17 DDL lines / 473 bytes, 6 seed lines / 517 bytes, and 86 reference
test lines / 4,262 bytes. The seeded live suite also intentionally covers
business behavior and transaction rollback; this evaluation does not propose
to replace those tests.

## E1 — Smallest seedless real-driver mapping proof

- **Hypothesis:** Typed CTE fixtures can execute canonical SQL through real
  PostgreSQL and `pg` without application-table seed rows, while retaining DTO
  representation evidence.
- **Setup:** PostgreSQL 16 in a disposable local container; Node v22.14.0,
  Windows, `pg` from the Reference. The harness reads canonical `get.sql` and
  `list.sql`, and owns two additional evaluation-only canonical query fixtures
  for a join and a query already containing a CTE.
- **Change:** Prefix typed `tickets` / `ticket_events` CTEs, compile the
  canonical named SQL, shift its indexed placeholders after separate fixture
  and application value arrays, then execute with `pg`.
- **Why smallest:** No product API, CLI command, parser, DSL, generator, or
  package dependency was added. The evaluator is one script.
- **Observation:** Simple get, optional-filter list with repeated logical
  parameters, two-table join, and pre-existing CTE all execute. The real driver
  returns `bigint` as string, `timestamptz` as `Date`, and nullable
  `assignee_id` as `null`.
- **Rework:** A replacement-string implementation corrupted `$1` fixture
  placeholders when injecting into existing `WITH`; a function replacer fixed
  it. An empty fixture list initially generated invalid `WITH`; it now leaves
  source SQL unchanged. A local variable shadowed the benchmark function. These
  are small but real transformation/harness failure modes.
- **Decision:** Keep only as evaluation harness. It demonstrates feasibility,
  not a product need.
- **Uncertainty / reconsideration:** Schema-qualified and recursive CTE SQL,
  dollar-quoted text, comments around `WITH`, and broader application SQL were
  not supported by this textual transformation. Evidence that a parser-free
  transformation can cover those safely would be needed before expansion.

## E2 — Physical-table fallback safety

- **Hypothesis:** A missing CTE fixture can fail closed cheaply without a SQL
  table-reference parser.
- **Change:** Each statement runs in a transaction with `SET LOCAL search_path
  = pg_temp`; fixture CTE names still resolve before tables, but a missing
  non-qualified relation cannot resolve to an existing `public` application
  table.
- **Observation:** With physical tables present from the seeded benchmark,
  missing `tickets` and missing `ticket_events` fixtures both failed with
  PostgreSQL relation-not-found errors rather than reading those tables.
- **Decision:** Keep this evaluator safety control. It is narrow: it does not
  protect schema-qualified references, which remain a material adoption cost.
- **Reconsideration:** A real application corpus dominated by unqualified
  read-only mapping SQL, together with evidence that this control is sufficient,
  could justify retesting at scale.

## E3 — DDL/fixture drift guard

- **Hypothesis:** A small structural comparison makes typed CTE fixture drift
  trustworthy enough for mapping tests.
- **Change:** Compare the experiment's two fixture column/type signatures to
  the existing DDL using a deliberately narrow line-oriented extractor.
- **Observation:** Current DDL passes. `bigint -> uuid` and an additional
  required column fail. A nullability-only change passes: finite fixture values
  cannot prove expression nullability and this guard does not claim to.
- **Decision:** Reject the guard as a general solution. It adds another parser
  shaped maintenance surface yet still leaves relevant false-green cases.
- **Reconsideration:** Reuse of authoritative generated relation facts that
  cover types, nullability, and table references without a second schema model
  would be needed to materially improve this conclusion.

## E4 — Warm performance comparison

- **Hypothesis:** Avoiding seed data is materially faster than the actual
  suite-level seeded reference.
- **Method:** Seven warm samples at 1, 10, 50, 100, and 300 repeated mapping
  checks. Seeded setup (drop/schema/seed) is timed separately from execution.
  CTE transformation is timed separately. Raw samples are in
  `benchmark-results.json`.
- **Result:** CTE transformation median was 0.031–0.058 ms, but CTE execution
  was slower at every measured size. Its total warm median was only modestly
  lower by omitting setup: at 300 checks seeded 195.26 ms versus CTE 191.52 ms;
  at 100 checks 77.83 ms versus 65.36 ms. The transformed one-relation query
  was 542 bytes.
- **Decision:** Reject a performance-default claim. The fair baseline already
  amortizes its schema/seed work across checks; a 4–12 ms raw difference does
  not repay transformation, drift, and debugging ownership.
- **Reconsideration:** A real corpus showing per-case setup is unavoidable, or
  a much larger mapping-only suite with a measured total-cost win after drift
  checks, would reopen this result.

## E5 — Fresh-Agent usability (known-technique prompt)

- **Hypothesis:** A fresh agent can use CTE shadowing from a short ordinary
  description without a repository helper or exact implementation recipe.
- **Setup:** A history-free agent received the requested short prompt, a
  repository-external temporary workspace, the existing canonical `list.sql`,
  real PostgreSQL 16, and `pg`. It was explicitly forbidden to use this
  evaluator harness or an Ashiba-specific helper.
- **Result:** It reached a working test in about seven minutes. Its CTE sentinel
  row was returned while physical tables were present, so it demonstrated CTE
  precedence rather than silently reading the seeded rows. It also checked
  optional filters and observed bigint strings, `Date` timestamps, and null.
- **Rework / friction:** PowerShell damaged `$n` placeholders on the first
  inline attempt; executing an ESM script outside the repository could not
  resolve `pg`; typed `bigint`, `timestamptz`, and nullable casts had to be
  made explicit. Most importantly, it manually copied the canonical
  select/filter/order/limit SQL into its temporary script.
- **Decision:** This is evidence that a short explanation can teach the narrow
  technique, not evidence that it naturally preserves canonical SQL ownership.
  No helper is justified: a helper would have to solve duplication, fixture
  typing, placeholder order, source transformation, and safety—exactly the
  unmeasured framework surface this experiment avoids adopting.
- **Remaining uncertainty / reconsideration:** A new fresh agent using a
  reliable source-SQL transformation with no duplication, fail-closed relation
  coverage, and no materially larger public surface would be stronger positive
  evidence. It must also beat the seeded total cost at a real scale.

## Stage 2 follow-up — benchmark fairness and mature-library challenger

The original benchmark had a limitation: its seeded arm executed a simplified
hand-written query while its CTE arm executed canonical `get.sql`. It must not
support a relative execution claim. Stage 2 preserves that result and reruns all
arms from the same canonical source, compile/bind path, parameters, selected
columns, and result representation.

### E6 — Same-SQL benchmark correction

- **Hypothesis:** The original performance direction remains after both seeded
  and shadowed arms execute the same canonical `get.sql` through Ashiba's named
  parameter compiler/binder and native `pg`.
- **Change:** Before every sample, suite-level physical schema/seed setup runs;
  its rows—including the seed's `now()` timestamp—are copied into the fixture
  input. The harness asserts identical field names, selected row, bigint string,
  timestamp `Date`, and nullable value before measuring.
- **Result:** The Stage 1 execution-only relative comparison is invalid because
  the seeded and CTE arms did not use the same SQL. Stage 2's same-SQL result
  confirms a seed-avoidance benefit at small counts and convergence toward a
  near tie by 300 checks (201.52 ms seeded vs 195.22 ms hand-built median).
  This corrects and weakens the performance finding; it is not adoption
  evidence because transformation and safety/drift costs remain.
- **Decision:** No material total-cost break-even was established in the
  measured suite-level, mostly serial mapping workload. The Stage 1 raw values
  remain historical evidence, not a relative execution result.

### E7 — rawsql-ts AST-backed challenger

- **Setup:** Current rawsql-ts source commit `546ad8d01e29ba9af30c0f0633bd0a8c86133ae8`; released packages
  `@rawsql-ts/testkit-postgres@0.16.9` and `@rawsql-ts/adapter-node-pg@0.15.18`
  were installed in an external temporary workspace. The retained evaluator uses
  the public `createPostgresTestkitClient(...)` API with a real `pg` executor;
  no rawsql-ts source was copied and Ashiba receives no dependency.
- **Result:** It uses canonical SQL directly and correctly handles get,
  optional list/repeated parameter, alias/join, existing `WITH`, and
  `public.tickets`. It removes Ashiba-owned placeholder shifting and textual
  `WITH` insertion. The 300-check median is 353.68 ms (353.73 ms with the
  cached generated-manifest freshness check), roughly 1.75 times seeded
  201.52 ms.
- **Safety result:** With complete fixtures, unqualified and schema-qualified
  physical sentinels were not returned. But an empty row fixture or empty
  generated manifest allowed a physical `tickets` read despite
  `missingFixtureStrategy: 'error'`; a partial join happened to receive a typed
  empty CTE for the missing relation. The behavior is not uniformly fail closed.
- **Decision:** This genuinely improves transformation fidelity and removes
  canonical-SQL duplication from the evaluator, but does not satisfy the
  physical-fallback safety rule and is slower in this same-SQL measurement.

### E8 — rawsql-ts DDL/manifest drift and freshness

- **Change:** Use rawsql-ts's public `DdlFixtureLoader` to create the same
  `generated.tableDefinitions` shape consumed by the testkit, then compare a
  regenerated snapshot against it. The package documentation describes
  `generated` as the preferred normal path (normally emitted by its config
  tooling); no generator surface was found in the inspected released package,
  so the evaluator does not claim to reproduce that upstream generation step.
- **Result:** Rename, removal, bigint-to-uuid, and additional-column changes
  change the metadata snapshot; a stale snapshot remains accepted until an
  explicit regeneration/diff check runs. NOT NULL-to-nullable and nullable-to-
  NOT NULL did not change this DDL-loader-derived manifest, so nullability drift
  remains false-green in this path. Warm snapshot regeneration was about
  0.04–0.10 ms, but this excludes any upstream generation/CI process.
- **Decision:** Freshness verification is required for any trustworthy generated
  metadata claim, and it still does not provide exhaustive result-nullability
  proof. No new synchronization system is added.

### E9 — Fresh-Agent rawsql-ts usability

- **Hypothesis:** A history-free user can reach a real-PostgreSQL CTE-shadowed
  mapping test with the existing mature public API, canonical SQL ownership,
  and no Ashiba-specific recipe.
- **Setup:** A fresh agent received only the external rawsql-ts workspace,
  PostgreSQL connection information, and a request to use existing canonical
  SQL without copying it. It chose the public `createPgTestkitClient` API from
  `@rawsql-ts/adapter-node-pg`, a real `pg.Pool`, one `tickets` definition, and
  one fixture row. It made no repository edits and wrote no custom SQL rewriter.
- **Observation:** In about ten minutes it read the existing-CTE SQL asset
  directly and observed its fixture row through real PostgreSQL. The generated
  execution had fixture CTEs/casts, retained the existing CTE, and bound the
  named input as `$1`. It needed PowerShell quoting repair and to stop closing
  the same pool twice. The packages were already installed; that result does
  not measure first-install or version-selection friction. Its chosen query
  uses an integer fixture and demonstrates its own `Date` representation; it
  does not independently re-prove the Ticket reference's bigint-string contract.
- **Decision:** Keep as positive evidence for direct canonical-SQL use and
  zero Ashiba rewrite LOC. It is not sufficient adoption evidence because the
  agent exercised only the complete-fixture path, while E7 established physical
  fallback for missing rows/metadata.
- **Reconsideration:** A blind holdout that covers complete and incomplete
  fixture cases, verifies the full target parameter/result contract, and
  demonstrates a fail-closed release could materially change the usability and
  safety conclusion.

### Stage 2 scope boundary — untested parallelism hypothesis

Stage 2 does **not** measure whether statement-local CTE fixtures change the
scaling of many independent mapping cases. A fixture embedded in each statement
does not share physical fixture state with another case, so connection reuse,
pool size, concurrent execution, and independently varying fixture rows could
have different characteristics from a shared physical seeded fixture.

That observation is a hypothesis, not a Stage 2 estimate. CPU, PostgreSQL,
pool, network, scheduler, and unrelated-lock contention still apply. Stage 3
must measure performance and fixture isolation separately rather than infer a
parallel speedup from statement locality.

## Stage 3 — parallelism, connection reuse, and statement-local isolation

`STAGE_2_FROZEN_SHA`: `a74858f346329ab90e67cfbc7369d256743276a3`

Stage 3 begins from that freeze. It adds evidence only; it does not rewrite the
Stage 1 or Stage 2 measurements.

### E10 — independent-case parallelism matrix

- **Hypothesis:** Statement-local fixtures may reduce wall time for many
  independent mapping cases because each case avoids physical fixture-state
  coordination under a shared pool or concurrent execution.
- **Method:** Real PostgreSQL 16 / real `pg`, `pool.max = 8`, 3 warm samples,
  10/50/100/300 cases, requested concurrency 1/2/4/8, and acquired-per-case,
  shared-pool, and shared-single-client reference models. Every case compiles
  and binds canonical `get.sql`, carries a unique ID/subject, and asserts it
  cannot read another case's row. The candidate is only the released public
  rawsql-ts testkit API; no Ashiba wrapper or rewrite cache was added.
- **Compared physical baselines:** Current shared physical fixtures seed all
  rows once and read them concurrently. The independent physical baseline uses
  the smallest conventional alternative: per-case transaction, one insert,
  canonical read, rollback, and release. It deliberately does not recreate a
  container, migrate per case, or make a schema per test.
- **Result:** The shared seeded baseline was fastest in every tested cell. Best
  300-case wall times were seeded 34.41 ms, independent physical 107.95 ms,
  and rawsql CTE 123.43 ms. No rawsql CTE break-even appeared through 300
  cases. rawsql CTE shared-pool scaling was not monotonic (concurrency 2 best
  at 10/50; 8 best at 100/300), while physical arms improved through 8 here.
- **Isolation result:** All matrix assertions passed with zero cross-case
  contamination. CTE complete fixtures required no physical fixture lock,
  transaction, cleanup, schema, or table isolation. The independent physical
  arm required transaction setup/rollback; at 300 cases / shared pool / 8 it
  accumulated 473.54 ms setup and 219.01 ms cleanup across concurrent cases.
- **Decision:** Keep an `isolation-advantage-only` finding, not a performance
  adoption result. Statement-local isolation is real and separate from speed;
  it does not beat the current shared physical default or the conventional
  isolated physical arm under this measured workload.
- **Remaining uncertainty / reconsideration:** Test a real production-scale
  independent mapping corpus above 300 cases only if it also preserves released
  fail-closed behavior and materially lowers total cost. A small timing win or
  another hand-built CTE implementation is insufficient.

### E11 — released rawsql-ts safety retained under the parallel harness

- **Hypothesis:** Stage 2's missing-fixture physical fallback must remain
  visible rather than being masked by a parallel benchmark.
- **Change:** Place a physical sentinel and execute both a complete fixture and
  `tableRows: []` through the same released public testkit API with
  `missingFixtureStrategy: 'error'`.
- **Result:** Complete fixture use returned the fixture row. Missing rows read
  the physical sentinel despite the error strategy, matching Stage 2.
- **Decision:** Do not add an Ashiba wrapper or change rawsql-ts behavior.
  Parallel isolation evidence applies only to complete fixtures and does not
  resolve this safety limitation.

## Stage 4 — scenario-oriented SQL logic fixtures

`STAGE_4_STARTING_SHA`: `85aee431c1bdfda79a0643f7bfaeeeac3f6ad728`

Stage 4 is additive evidence from the Stage 3 final commit. It does not revise
the Stage 1–3 mapping classifications or measurements.

### E12 — fixture-scale SQL logic comparison

- **Hypothesis:** When scenario-specific multi-relation fixture data defines SQL
  logic, avoiding physical writes/rollback may make rawsql-ts CTE shadowing
  materially cheaper than conventional transaction-isolated batched fixtures.
- **Method:** An evaluation-only order-eligibility query family varies actual
  business state and asserts either its own winning order/token or no row. S/M/
  L/XL use 1/2/4/8 relations, 3/10/30/99 rows, and 392/997/3,115/9,480 fixture
  input bytes. Real PostgreSQL 16 / real `pg`, `pool.max = 8`, 10/50/100
  scenarios, 1/4/8 concurrency, three warm samples. Physical uses acquire,
  `BEGIN`, batched per-relation inserts, query, `ROLLBACK`, release. CTE uses
  public base-client `withFixtures(...)`, Ashiba bind, and real `pg`.
- **Natural API check:** The current public testkit documents `withFixtures` as
  the scenario layering path. A small XL probe measured 20.68 ms median for it
  and 21.40 ms for a new client; the small difference does not outweigh using
  the explicit public scenario API. No internal rewrite cache was used.
- **Result:** Best-concurrency physical was faster at every scale/count. At 100
  scenarios: S 48.57 vs CTE 71.10 ms; M 48.80 vs 117.25; L 92.33 vs 270.74;
  XL 233.41 vs 1,184.09. CTE was faster only in serial S/M cells, not a robust
  advantage. CTE generated SQL grew from about 798 bytes/scenario (S) to
  17,053 (XL); fixture/rewrite/query work grew faster than physical batched
  writes under shared-pool concurrency.
- **Correctness / isolation:** All logic assertions passed with zero cross-
  scenario contamination. Complete CTE scenarios need no physical fixture
  transaction, cleanup, lock, schema, or table isolation.
- **Decision:** `logic-test-isolation-only`. Scenario fixtures are a more
  natural structural use than shared DTO mapping seeds, but the released
  public implementation does not obtain a total-cost or performance win here.
- **Reconsideration:** Stop repeating small benchmarks. Reopen only for a
  material released safety/implementation-cost change, materially different DB
  conditions, or a real production corpus that contradicts this scale matrix.

### E13 — SQL logic physical-fallback negative control

- **Hypothesis:** Complete scenario isolation must not obscure the known empty-
  fixture physical fallback.
- **Change:** Insert an eligible physical XL sentinel at priority 77; query the
  same token once with a complete CTE fixture at priority 20 and once with
  `tableRows: []` plus
  `missingFixtureStrategy: 'error'`.
- **Result:** The complete fixture returned priority 20 over the physical
  priority-77 sentinel. Empty fixtures applied no CTE and returned physical
  priority 77. This proves both fixture precedence and the released fallback
  behavior.
- **Decision:** Preserve as a safety limitation. Stage 4 adds no Ashiba wrapper
  and performance claims apply only to complete fixtures.
