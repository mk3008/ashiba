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
