# Evaluation report

## Result: READY

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
