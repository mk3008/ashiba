# AI-native construction baseline

## Scope and method

This pilot used two PostgreSQL fixtures (Greenfield and ordinary layered
Brownfield) and three fresh-agent conditions. A prohibited generators while
allowing final verification; B made Ashiba available without asking for it;
C required init/generate/check. The [fixture contracts](fixtures/ai-native-construction/README.md)
require canonical SQL, binding, optional search, finite sorting, pagination,
transaction rollback, JSONB/ILIKE/TIMESTAMPTZ, and a driver type boundary,
without requiring an Ashiba scaffold.

Six agents wrote local logs. An independent reviewer inspected their source,
then the parent independently reran every final application against its own
disposable PostgreSQL database. Runtime token and credit use were unavailable.

## Constitution candidate

See [the short constitution](../concepts/ai-native-construction-constitution.md).
Canonical SQL ownership and parameter binding are **proven/current**. Finite
runtime syntax, source-bounded capability, subtraction-first dynamics,
executable SQL resources, PostgreSQL contract evidence, and thin integration
are **strong hypotheses**. SQL/transaction-centered human review is an **open
hypothesis**. Application architecture ownership is an **intentional non-goal**.

## Pilot results

| Run | Independent result | Tool observation |
|---|---|---|
| Greenfield A | typecheck; PostgreSQL **6/6 pass** | No generator/verifier applicable to chosen generic shape. |
| Greenfield B | typecheck; unit **2/2**, PostgreSQL **4/4 pass** | Environment inspected; no Ashiba command selected. |
| Greenfield C | build; PostgreSQL **6/6 pass**; static check passes | init, scaffold, model-gen; duplicate contract and mapper/name drift repaired. |
| Brownfield A | typecheck; existing + feature PostgreSQL **8/8 pass** | No generator; no verifier found applicable. |
| Brownfield B | typecheck; existing + feature PostgreSQL **11/11 pass** | Ashiba discovered from README; no command selected. |
| Brownfield C | typecheck; existing + feature PostgreSQL **8/8 pass**; fast/full checks pass | init/scaffold ran in a disposable probe; generated vertical boundary was discarded. |

Reruns cover parameterized injection, rejected unsafe sort, deterministic
pages, JSONB ordering/empty cases, `ILIKE`, `TIMESTAMPTZ`, raw driver types,
success, and rollback. Greenfield C's configured `npm test` only ran unit
tests, so its green `check --full` is not counted as live transaction proof;
the parent separately ran its live suite.

## CLI judgment

| Responsibility | Judgment | Evidence and limit |
|---|---|---|
| `check` / `check --full` | **Core Verify candidate** | C used it successfully after implementation; test-command coverage remains application-owned. |
| PostgreSQL contract check | **Insufficient Evidence** | It was neither naturally selected nor tested by C. |
| `init` | **Optional Accelerator** | It supplied a starter but required prerequisites and yielded non-fitting material. |
| feature scaffold / model-gen | **Optional Accelerator** | It produced useful artifacts but needed Greenfield repair and Brownfield rejection. |
| architecture / transaction policy | **Application Responsibility** | Brownfield retained its own layered transaction helper. |
| unselected CLI | **Not Remove Candidate** | Two B non-selections are not deletion evidence. |

## Verify-first and Dynamic SQL

Verify-first is **partially supported**: B reached correct live behavior with
no generator; C's clearest value was the post-implementation contract signal.
One run per cell cannot establish error rates or general adaptability. A green
verifier can also overstate coverage if its configured test command omits the
live lane. `ready` should therefore include explicit lane coverage.

Dynamic SQL questions for `Dynamic SQL Necessity Audit`:

- When is a new canonical query required rather than a finite subtractive branch?
- Are CASE-based finite sorts sufficient for expression/collation/multi-column needs?
- Should a PostgreSQL-executable resource accompany named-parameter SQL?
- Can verification detect an incomplete declared full-test lane?

No query builder, pagination abstraction, scaffold redesign, VSA mandate,
repository abstraction, MCP, or CLI deletion was implemented.

## Recommended next experiment

Use several independently seeded runs per cell and an external evaluator.
Inject one SQL-contract, transaction, and driver-mapping defect after
construction; measure real detection, false repair, and live-retest survival.

## Attainment

| Acceptance item | Status | Evidence | Gap |
|---|---|---|---|
| Competitive benchmark integration | **done** | [PR #46](https://github.com/mk3008/ashiba/pull/46) is clean and all CI checks passed. | Human review/merge is external. |
| Constitution candidate | **done** | Short classified document is checked in. | Hypotheses remain deliberately open. |
| Fixtures | **done** | Greenfield/Brownfield contracts are checked in. | Run artifacts remain supplementary. |
| A/B/C pilot | **done** | Six logs and six independent PostgreSQL reruns. | One run per cell, not statistical. |
| Verify-first / CLI judgment | **done** | B non-adoption, C repairs, and rerun evidence. | Contract CLI and false-positive rates untested. |
| Dynamic SQL handoff | **done** | Questions are recorded above. | No solution claimed. |

**Outcome: done, with deliberately bounded conclusions.**
