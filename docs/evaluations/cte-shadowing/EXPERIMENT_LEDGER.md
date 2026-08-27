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
- **Result:** The correction reverses the first stage's small raw total result
  for the hand-built arm: it is faster than seeded setup at 1/10/50 checks but
  essentially tied by 300 (201.52 ms seeded vs 195.22 ms hand-built median).
  This is a benchmark correction, not evidence for adoption: source
  transformation and safety/drift costs remain.
- **Decision:** The original performance conclusion is **weakened but not
  reversed**. Avoiding a 13–19 ms suite setup can matter in small isolated
  mapping checks; no material total-cost break-even was established.

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
