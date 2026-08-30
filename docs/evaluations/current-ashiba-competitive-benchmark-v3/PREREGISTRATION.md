# Preregistration

## Status and freeze point

This document is the frozen design for the scored execution of Current Ashiba
Competitive Benchmark v3. The commit containing this document is the
preregistration commit. No scored candidate is started before that commit.

The benchmark uses Node.js 24.18.0, PostgreSQL 18.6, strict TypeScript, a
fresh candidate directory, and an isolated runner-owned database namespace for
each cell. Exact dependency resolutions and package/tarball hashes are written
to `MANIFEST.md` and each candidate's `run.json` before its first attempt.

## Research questions and hypotheses

The primary question is: under the measured, AI-assisted TypeScript/PostgreSQL
conditions, where does Current Ashiba provide a rational adoption option
relative to Prisma, sqlc, Drizzle, Kysely, and native `pg`?

H1 (learning disadvantage): Ashiba has substantially less likely model-training
familiarity than established tools. Its small, SQL-native surface may offset
that disadvantage for bounded work, but this is an observation to measure, not
an assumption.

H2 (architecture fit): a tool with fewer required tool-owned structures should
be easier to introduce into a frozen VSA or layered application. This may trade
away integrated guarantees and ecosystem value.

H3 (raw SQL harness): visible SQL plus named binding, a native driver, finite
reviewed composition, and live tests may be enough deterministic safety for
bounded AI-assisted work without a framework-owned architecture.

## Arms and treatments

| ID | Frozen treatment | Required normal path | Status handling |
| --- | --- | --- | --- |
| A | Current Ashiba `@ashiba-ts/named-parameters@0.1.0` packed from this baseline + `pg` | visible SQL, `compileNamedParameters`, `bindNamedParameters`, native `pg` | current product |
| P | Prisma ORM 7.10.0 GA | Prisma schema/client/data-access workflow; raw SQL escape hatches may be used only inside Prisma and are counted | Prisma 8.0.0-rc.12 is recorded separately as current/recommended prerelease, not silently labelled stable |
| S | sqlc 1.31.1 + `sqlc-gen-typescript` 0.1.3 | generated TypeScript query path and its normal PostgreSQL driver boundary | TypeScript plugin is early access and is reported as such |
| D | `drizzle-orm` 0.45.2 + `drizzle-kit` 0.31.10 + `pg` | Drizzle query/SQL and transaction path | stable line; 1.0.0-rc.4 is not substituted |
| K | Kysely 0.29.5 + `pg` | Kysely query/SQL and transaction path | stable package resolution |
| G | `pg` 8.23.0 | native `pg` only | control, not a competitor claim |

No arm may solve its main data-access path by replacing the declared treatment
with a different arm's direct driver or framework. A runner-owned adapter may
load the frozen public API but must not alter candidate source, create a query,
or provide transaction logic. Behaviour and treatment fidelity are reported as
separate axes.

## Candidate-facing common API

Every candidate must export `createApplication(runtime)` from
`src/application.ts`. Its return object must contain the frozen operations in
`fixtures/COMMON_API.md`: `list`, `get`, `create`, `assign`, `transfer`,
`claim`, and `investigate`. The runner supplies a `runtime` object containing a
connection URL and a safe schema identifier; candidates must not use `public`.
The API is an evaluator integration boundary, not a product API.

## Scored cells

Each primary workload/arm pair has two independent Fresh-Agent replicates:

| Workload | Purpose | Cells |
| --- | --- | --- |
| G1 | bounded ticket application plus one maintenance change | 6 arms × 2 |
| T1 | atomic debit/credit/audit transaction | 6 arms × 2 |
| T2 | concurrent work-item claim | 6 arms × 2 |
| Q1 | PostgreSQL-centric query, diagnosis, SQL/EXPLAIN investigation, and behaviour-preserving improvement | 6 arms × 2 |
| AF-V | VSA brownfield integration | 6 arms × 2, scored as architecture fitness |
| AF-L | layered brownfield integration | 6 arms × 2, scored as architecture fitness |

X1 open-ended report composition, schema/migration capability survey, schema
drift control, and one exit-cost removal exercise per selected representative
arm are non-aggregate controls. They are not combined with primary results.

All scored Fresh-Agent cells use the same model, effort, permissions, and
timebox recorded in `ARM_TREATMENTS.md`. Replicates receive no source, repair
hints, output, errors, or result from another replicate.

## Success and scoring

For each attempt, record independently:

1. first implementation strict TypeScript result;
2. first candidate-test result;
3. first runner-owned PostgreSQL oracle result;
4. final live behaviour result;
5. treatment fidelity (`pass`, `fail`, or `unknown` with evidence);
6. composite strict result.

The PostgreSQL oracle is behavioural authority. Treatment fidelity prevents a
behaviour pass achieved through a disallowed bypass from being described as a
normal workflow success. No aggregate score or overall winner is calculated.

## Repair and exclusion policy

Each candidate receives one initial implementation attempt and at most two
candidate repairs. Repairs are classified as candidate logic, API/tool misuse,
type-system, SQL, database-specific, generated-state, config, install/dependency,
environment, harness/evaluator, or patch/application-format. Only candidate/
tool-related repairs contribute to the primary repair-burden reading;
environment and harness failures remain published separately.

A cell is excluded only before scoring for an unavailable declared package,
unavailable required binary, a runner defect that makes the frozen public API
unevaluable, or a documented permission/environment failure. It is never
silently replaced. Calibration runs are labelled non-scored. A harness defect
after a scored attempt requires preservation of the original candidate and
output, a correction commit, a correction ledger entry, and remeasurement only
of affected cells.

## Inputs and fairness

The agent may use the installed package's official README/docs/guidance and
ordinary tools. It may not inspect this repository's historical benchmark,
another candidate, or a prior candidate output. Ashiba is always supplied as a
packed tarball only. Major-arm product-specific instructions must be no more
detailed than the corresponding official guidance; words/files actually read
are measured. Model familiarity is deliberately measured as an AI-era adoption
axis, not erased or treated as intrinsic technical quality.

## Metrics

Per cell preserve exact prompts, guidance packet hashes, source snapshot,
dependency manifest/lockfile, commands, output, first-pass states, repairs,
oracle result, treatment review, files/lines touched, generated persistent
artifacts, direct dependencies, tool-specific configuration, wall time if
reliable, and token/credit values only if runtime reports them. Missing telemetry
is recorded as `unavailable`.

