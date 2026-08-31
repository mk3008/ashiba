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
