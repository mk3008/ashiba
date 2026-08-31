# Evaluation report

## V2 result: READY

Natural-language Raw SQL Rules are sufficient for the evaluated scope: an
application using ordinary SQL assets and a native named-parameter-capable
driver. No runtime framework, loader, generator, or helper was found necessary.

PR base SHA (latest `origin/main`): `690d1c38935aae4aa6a667c34675caf3de6e7139`.
Frozen v0 Rules SHA-256: `A3440D14656667057C4784269DD6FDEA4F849ED83E2869169B841A0F41D7FB9B`.
Final v2 Rules SHA-256: `18D0374C9FBFDFB9CEF28646A624A29AFF405D7B807E44BC43FBDCC56D86C521`.

## Method

The v0 Rules were hashed before evaluation. The suite has 20 adversarial
scenarios, with 10 important boundaries. Every important boundary receives two
independent fresh judgments. Deterministic checks inspect package isolation and
fixture structure. Evidence is retained under `evidence/`.

## Observations and amendment

The v0 judges consistently rejected unsafe interpolation, dynamic identifiers,
inline application DML, schema reconstruction from migrations, and framework
escapes. They consistently allowed bound values, native named parameters,
finite complete sort forms, complete reviewed asset selection, and inline
control/probe SQL.

They found one meaningful ambiguity: a safe multi-filter case could look like
forbidden runtime predicate construction. Amendment A1 made the intended
solution explicit: use one fixed bound statement where possible; otherwise
select a complete reviewed SQL asset, never fragments. The same amendment made
DDL discoverability a practical object-location test rather than an arbitrary
file-size limit and made the native-named-driver condition explicit. The v1
regression found no remaining critical escape. Amendment A2 then added the
database/driver runtime authority and test boundary; it has its own independent
regression evidence.

## Scenario attainment

| Group | Status | Evidence | Gap |
| --- | --- | --- | --- |
| SQL assets and inline boundary (S01-S03) | done | Rules 2 and query fixtures distinguish application DML from control/probe SQL. | No live driver execution. |
| Values, syntax, ordering, optional filters (S04-S09, S16-S18) | done | Two independent v0 judgments; A1; v1 regression. | Dynamic cases remain source/rubric evaluated. |
| Reviewability and schema discovery (S10-S13) | done | Commented cursor fixture, canonical object DDL, Rules 3/6, v1 regression. | Actual huge-schema usability needs a real repository case. |
| Architecture escape resistance (S14-S15) | done | Rules 1/7 and dependency scan. | Does not prove future agents will obey Rules. |
| Database/driver behavior authority (S19-S20) | done | Rule 8 and two independent source/rubric judgments. | This generic workbench does not execute a target engine; each adopting application must supply that live regression evidence. |

## Verification boundary

The primary driver model is SQL Server-style native `@name` binding, selected
from existing repository evidence; fixtures use portable `:name` notation only.
No database or driver was installed and no live execution occurred.
`scripts/check.mjs` verifies only structural facts and explicitly does not prove
SQL semantics, concurrency, cardinality, retry safety, or runtime driver types.
Those require application/live database tests in each adopting project.

## Distribution and exclusions

`RULES.md` plus a README or `AGENTS.md` reference is sufficient distribution.
A Skill would duplicate the authority without adding behavior, so none is
justified. PostgreSQL adaptation, the existing Ashiba named-parameter package,
and ORM competition are explicitly out of scope. No mechanical helper was
found necessary for this scope.

## Remaining limitations

The Rules cannot mechanically establish that a particular whitelist is finite,
that a SQL comment is correct, or that database behavior is correct. They make
those obligations visible; application tests provide the remaining proof.

## V3 re-evaluation: NOT-YET

Rules v3 (`D64A04870EF16FB883F76DBB428D22332679E861E25B7E0B2D7647B6231D84C3`)
removes evaluation-specific wording from Rule 5 without adding a new mechanism.
The actual MySQL 8.4/mysql2 3.22.3 lane passed: `:name` object binding,
optional filtering, a UNIQUE constraint rejection, and observed runtime
representations were exercised through the real driver. Its exact output is in
`evidence/v3/live-mysql.md`.

Five fresh goal-driven implementation probes were then retained as actual
candidate diffs under `evaluation/v3/probes/`. P02 used canonical DDL rather
than migrations; P03 used real SQLite native execution; P04 used real MySQL
and a thin application-owned asset loader. Separate read-only review and a
boundary advisor found no dynamic-syntax, ORM, framework, or hidden-DAL escape.

P01 and the independent P05 repeat both created safe finite sort assets and
named optional filters, but both chose mock-only tests rather than executing a
real engine and native driver. Fresh review classifies each as a Rule 8 failure.
This is repeated goal-driven behavior, not an environment limitation: the V3
MySQL lane was available and passed. Therefore the evidence does not support
READY's claim that Rules alone reliably constrain this important boundary.

| V3 acceptance item | Status | Evidence | Gap |
| --- | --- | --- | --- |
| Goal-driven implementation probes | partial | Five actual candidate diffs and independent reviews. | P01/P05 omit Rule 8 live coverage. |
| MySQL native driver live lane | done | `evidence/v3/live-mysql.md`; `test:live` succeeds. | One driver/dialect only. |
| Normal CI connection | done | Package `test` runs `check`; the observed root recursive run is preserved in `evidence/v3/verification.md`. | Live lane is intentionally not ordinary CI. |
| Permanent contract wording | done | Rule 5 v3 and v3 hash/amendment. | PostgreSQL adapter remains separately deferred. |

The final decision is **NOT-YET**. A further experiment must establish a
minimal, non-framework way for goal-driven changes to consistently produce
database-backed tests, or demonstrate that this expectation belongs in a
separate application task contract rather than Raw SQL Rules.

## V4 re-evaluation: NOT-YET

V4 preserves V3's `NOT-YET` finding and leaves Rule 8 and the v3 Rules hash
unchanged. It tests a narrower distinction: implementation constraints in
`RULES.md` versus a separate task completion condition. The initial four
dispatches are retained under `evaluation/v4/probes/{a1,a2,b1,b2}` but are not
treatment evidence: the shared fixture README was absent at dispatch time.
That packet error and the unmodified initial candidates are documented in
`evidence/v4/environment-correction.md`.

The corrected packet supplied the frozen Rules, MySQL/mysql2 connection details,
and schema to three fresh agents. Arm A received Rules only; Arm B additionally
received the completion contract preregistered in `evaluation/v4/PLAN.md`.

| Corrected arm / probes | Primary outcome: native mysql2 executed against MySQL before completion | Independent review |
| --- | --- | --- |
| A / A1, A2 | yes, yes | both pass |
| B / B1 | yes | pass |

All three corrected candidates created native mysql2 tests and successfully
executed representative changed SQL against disposable MySQL 8.4. They also
kept named bindings, finite complete SQL assets, and safe sort handling. This
does **not** support the hypothesized distinction: the Rules-only arm did not
repeat V3's omission. It is likewise too small to establish that Rules-only
behavior is reliable; the corrected fixture context is a material confound
against V3's less concrete implementation tasks.

| V4 acceptance item | Status | Repository evidence | Gap |
| --- | --- | --- | --- |
| Preregistered A/B completion-contract experiment | partial | `evaluation/v4/PLAN.md`, retained preflight candidates, corrected candidates, and `evidence/v4/agent-output.md`. | Corrected treatment has three, not four, probes after the packet error. |
| Rules-only arm observation | done | Corrected A1/A2 candidates and `evidence/v4/independent-reviews.md`. | Both passed, conflicting with V3; causal attribution remains unresolved. |
| Completion-contract arm observation | partial | Corrected B1 native MySQL test passes. | One corrected B probe cannot establish consistency. |
| Rule 8 / framework boundary | done | No Rules change, helper, testkit, or framework; V4 evidence records only application candidates. | No mechanical enforcement was evaluated or introduced. |

The final decision remains **NOT-YET**. Keep Rule 8 as the runtime-authority
principle; V4 does not establish that a short completion contract reliably
causes live verification, nor that Rules alone reliably do so. Do not add more
Rules prose or mechanical enforcement from this result alone.

## V5 re-evaluation: READY-WITH-LIMIT

V5 stops the V4 completion-contract line. A bootstrap fixture provided canonical
DDL, one application SQL asset, mysql2, and a discoverable disposable MySQL
endpoint, but no database-backed test. One bootstrap candidate established the
smallest reusable path: canonical DDL, MySQL/native-driver execution of the
actual asset, representative data, behavior assertions, relevant runtime type
assertions, and one repeatable command. It did not add a framework.

Two ordinary steady-state changes then received only Rules plus that visible
repository example. Both naturally extended the pattern: a SELECT filter
covered null compatibility and Date behavior; an INSERT covered returned
values/types and ENUM/NOT NULL database constraints. All three live commands
passed and independent review found no abstraction escape.

| V5 acceptance item | Status | Evidence | Gap |
| --- | --- | --- | --- |
| Bootstrap authority path | done | `evaluation/v5/bootstrap/candidate/` and `evidence/v5/results.md`. | One MySQL fixture/query shape only. |
| Steady-state reuse | done | Two candidate diffs and `evidence/v5/independent-review.md`. | Two agents/changes do not prove universal behavior. |
| Rule amendment or mechanics | done | Rule 8 unchanged; no framework/helper/testkit added. | Bootstrap wording remains evaluated task guidance, not a permanent Rule. |

The decision is **READY-WITH-LIMIT** for the evaluated two-state contract:
when a DB-backed path is absent, establish one small authority path; afterward,
Rules plus the visible repository example were sufficient in this study. The
remaining limit is agent/task diversity, not a known unsafe escape.
