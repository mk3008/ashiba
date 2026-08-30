# AI-native construction constitution candidate

This is a short, revisable rule set for construction experiments. It describes
what Ashiba should preserve, not a required application architecture or a
decision that every current mechanism is a universal guarantee.

## Classification

| Candidate | Status | Confirmed evidence | Boundary / open question |
|---|---|---|---|
| Canonical SQL ownership | **Proven/current invariant** | `.sql` remains the visible source of query behavior; applications may load or embed it through ordinary tooling. | Applies to SQL an application chooses to keep canonical, not to a prescribed filesystem layout. |
| Parameter binding | **Proven/current invariant** | `compileNamedParameters` and `bindNamedParameters` deterministically lower named SQL and reject missing or unused names before the application calls its native driver. | It does not police an application's separate direct-driver calls. |
| Runtime input must not freely become SQL syntax | **Strong hypothesis** | Application-owned finite mappings can keep public sort selection separate from raw request text. | A whole-application non-interpolation guarantee is not established. |
| Runtime capability must not silently exceed canonical SQL | **Strong hypothesis** | Applications compile canonical SQL at a controlled initialization or build point; the prepared representation is not a second source of truth. | Application-owned optional branches and sort mappings need ordinary review and tests; Ashiba does not perform runtime SQL rewriting or freshness lifecycle management. |
| Optional query behavior | **Strong hypothesis** | Nullable guards and explicit visible SQL variants keep optional predicates reviewable. | Applications choose the appropriate SQL shape and own semantic proof. |
| Closed-world syntax construction when construction is unavoidable | **Strong hypothesis** | A finite application-owned mapping can select already-visible SQL behavior without request text becoming syntax. | Completeness and review of that mapping are application responsibilities. |
| Independent SQL executability | **Strong hypothesis** | Canonical SQL remains ordinary target-dialect SQL that can be reviewed in SQL clients and tested through the native driver. | Named-parameter canonical source is not necessarily unmodified PostgreSQL client syntax; applications own any loading or placeholder adaptation needed by their tooling. |
| Database/application contract verification | **Strong hypothesis** | Native database tooling and application/live tests can check the database and result contract at the boundary. | These checks are optional and application/external-tool owned; they do not prove business semantics, transaction behavior, or DTO shape by themselves. |
| Declared proof-lane execution | **Open hypothesis** | The proof-lane pilot showed that an external strict manifest can aggregate application-declared command exit results and prevent a selected unit-only command from being treated as the result of separately declared live and transaction commands. | The declaration cannot establish that the declared set is sufficient, nor that a successful command proves the intended semantics. It must not be called application correctness or readiness without an explicit scope. |
| Thin, replaceable runtime integration | **Strong hypothesis** | The core `FeatureQueryExecutor` seam and runtime boundary deliberately exclude an ORM runtime. | Replaceability is a migration claim that needs application-level evidence, not just an interface. |
| Application architecture is not owned by Ashiba | **Intentional non-goal** | The runtime boundary leaves workflow, transaction composition, route/worker adapters, retry safety, and migration apply to the application. | Generated examples may still exert architectural pressure; construction pilots must measure it. |
| Human review can focus primarily on SQL and transaction boundaries | **Open hypothesis** | Visible SQL and explicit transaction ownership are supported review targets. The responsibility placement audit measured a targeted refresh of two files versus broad generated refresh of 4/22/202 files at fleets of 1/10/100. | Current generated contracts, mappers, metadata, recovery output, and test-lane configuration may still dominate review. Only comparative review evidence can establish the priority. |

## Candidate rules for the pilot

1. Treat canonical visible SQL as the source of query behavior; an application
   may cache a prepared representation but it is never a second authority.
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
5. Keep canonical SQL reviewable and executable through ordinary SQL tooling;
   do not make correctness depend solely on an opaque application artifact.
6. Treat database-derived observations as scoped development evidence and name
   what they do not prove. A green selected test command proves only that
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
