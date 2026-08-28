# AI-native construction constitution candidate

This is a short, revisable rule set for construction experiments. It describes
what Ashiba should preserve, not a required application architecture or a
decision that every current mechanism is a universal guarantee.

## Classification

| Candidate | Status | Confirmed evidence | Boundary / open question |
|---|---|---|---|
| Canonical SQL ownership | **Proven/current invariant** | `.sql` is declared canonical and generated `query.sql.ts` is a runtime snapshot in [the runtime boundary](../guide/runtime-boundary.md); `README.md` directs edits to SQL rather than its generated snapshot. | Applies to Ashiba-managed query resources, not to arbitrary SQL an application chooses to hide elsewhere. |
| Parameter binding | **Proven/current invariant** | The PostgreSQL adapter binds named parameters before execution and rejects invalid bindings; coverage is in `packages/driver-adapter-pg/tests/driver-adapter-pg.test.ts`. | It does not police an application's separate direct-driver calls. |
| Runtime input must not freely become SQL syntax | **Strong hypothesis** | Safe sort accepts a finite reviewed surface and rejects SQL-like input ([safe-sort guide](../guide/safe-sort.md)); core adapter tests cover that rejection. | The Concept Map marks the broader product posture partial. A whole-application non-interpolation guarantee is not established. |
| Runtime capability must not silently exceed canonical SQL | **Strong hypothesis** | Source hash, generated metadata, optional-condition compression, and safe sort are checked before the PostgreSQL adapter executes ([runtime boundary](../guide/runtime-boundary.md)). The [Dynamic SQL Necessity Audit](../evaluations/dynamic-sql-necessity-audit.md) observed that binding/subtraction preserve this boundary and a finite map preserves it only when complete source-visible terms are reviewed. | Present proof is specific to supported PostgreSQL rewrites and adapter paths, not every dialect or application runtime; a builder intentionally broadens the surface when a product needs open composition. |
| Subtraction-first dynamic behavior | **Strong hypothesis** | SSSQL and the competitive evaluation favour finite canonical queries or finite subtractive branches. The Dynamic SQL Necessity Audit found it adequate for known optional predicate and `HAVING` branches. | Optional joins/projections often became clearer as separate SQL, so subtraction is a preference order rather than a product-wide, mechanically enforced rule. |
| Closed-world syntax construction when construction is unavoidable | **Strong hypothesis** | Safe-sort metadata is source-visible and finite; duplicate/unsafe choices are rejected. The Dynamic SQL Necessity Audit executed finite complete sort terms, including direction, multi-key, collation, `CASE`, and explicit null policy, without request text becoming syntax. | Current Safe Sort deliberately rejects explicit null ordering; dynamic-keyset variant growth remains unmeasured, so this cannot be upgraded to a universal invariant. |
| Independent SQL executability | **Strong hypothesis** | The Concept Map calls for SQL that remains usable in SQL clients, and SQL-resource work can emit PostgreSQL-executable derived SQL. | Named-parameter canonical source is not necessarily unmodified PostgreSQL client syntax; the executable resource relationship needs explicit preservation. |
| PostgreSQL/application contract verification | **Strong hypothesis** | `postgres-contract` prepares canonical SQL against PostgreSQL and derives catalog/driver evidence; live tests prove this lane. The [responsibility placement audit](../evaluations/responsibility-placement-audit.md) independently exercised bigint, numeric, nullable, enum, domain, and array contract evidence against disposable PostgreSQL and a separate JSON oracle. | It is optional and PostgreSQL-specific; it does not prove business semantics, transaction behavior, JSON DTO shape, all nullability implications, or that an arbitrary configured test command ran every required live lane. |
| Declared proof-lane execution | **Open hypothesis** | The proof-lane pilot showed that an external strict manifest can aggregate application-declared command exit results and prevent a selected unit-only command from being treated as the result of separately declared live and transaction commands. | The declaration cannot establish that the declared set is sufficient, nor that a successful command proves the intended semantics. It must not be called application correctness or readiness without an explicit scope. |
| Thin, replaceable runtime integration | **Strong hypothesis** | The core `FeatureQueryExecutor` seam and runtime boundary deliberately exclude an ORM runtime. | Replaceability is a migration claim that needs application-level evidence, not just an interface. |
| Application architecture is not owned by Ashiba | **Intentional non-goal** | The runtime boundary leaves workflow, transaction composition, route/worker adapters, retry safety, and migration apply to the application. | Generated examples may still exert architectural pressure; construction pilots must measure it. |
| Human review can focus primarily on SQL and transaction boundaries | **Open hypothesis** | Visible SQL and explicit transaction ownership are supported review targets. The responsibility placement audit measured a targeted refresh of two files versus broad generated refresh of 4/22/202 files at fleets of 1/10/100. | Current generated contracts, mappers, metadata, recovery output, and test-lane configuration may still dominate review. Only comparative review evidence can establish the priority. |

## Candidate rules for the pilot

1. Treat canonical visible SQL as the source of query behavior; derived runtime
   artifacts may be regenerated but are never a second authority.
2. Accept runtime values through parameter binding. Add SQL syntax only by
   changing reviewable canonical SQL first.
3. If runtime variability is unavoidable, constrain it to a finite,
   reviewable, source-linked input surface and fail before execution when that
   surface is stale or unsupported.
4. Prefer binding, then a finite subtractive branch, then a finite
   source-linked construction or another canonical query before a general
   runtime query builder. Use a governed builder when the product really owns
   an open query language; this is a working order, not a claim that every
   need fits it.
5. Keep an independently runnable SQL resource or a documented derivation for
   a SQL client; do not make correctness depend solely on application code.
6. Treat PostgreSQL-derived contract output as scoped development evidence and
   name what it does not prove. A green selected test command proves only that
   selected command; it is not proof that required PostgreSQL or transaction
   lanes were covered.
7. If an application elects to declare proof lanes, distinguish the
   application-owned adequacy of the declaration from the mechanically
   checkable fact that every declared required command was run and exited
   successfully. Do not infer omitted obligations from a green aggregate.
8. Keep runtime integration thin. Application workflow, transaction policy,
   migration application, and public architecture remain application-owned.
9. Do not assume the desired human review surface. Measure whether the SQL and
   transaction boundary are actually easier to review than generated and
   integration artifacts.

## Non-goals for this phase

- Defining a general query builder, repository abstraction, prescribed application layout, or
  application framework.
- Claiming all dynamic SQL is unsafe or that all SQL is directly executable
  without a parameter/resource derivation.
- Promoting optional PostgreSQL contract verification to a substitute for
  behavioral or transactional integration testing.

The pilot report updates this candidate only when observed construction or
review evidence supports a change.
