# Secondary controls preregistration

## Protocol status

Protocol version: `secondary-controls-v1`.

These controls are not combined with the 48-cell primary matrix and do not
produce an overall winner. They start only after their run packet (tool
versions, prompt, packet hashes, baseline manifest, runner hash, and fixture
hash) is committed. A packet correction after the first scored control follows
the primary correction policy: preserve original evidence, add a correction
ledger entry and commit, then remeasure every affected control.

All Fresh-Agent controls use the primary benchmark model, effort, permissions,
Node 24, PostgreSQL 18, repair cap (initial plus two repairs), isolated
directory, per-candidate npm cache, and nonce schema/role. Token and credit
telemetry are `unavailable` unless directly emitted by the runtime. Speed is
recorded only when reliable and is not a comparison criterion.

## AF-V and AF-L

Each arm has two independent replicates for each frozen architecture. The
candidate begins from the supplied immutable skeleton and adds the same G1
data-access feature. The runner verifies the primary G1 behavioural contract
through the existing runner plus a runner-owned architecture-delta record.

The delta record measures only additions required by the treatment:

* moved or renamed existing skeleton files;
* newly required global/config/schema/generated directories;
* required build/code-generation/configuration step;
* change to the supplied pool, transaction seam, DTO, or test seam; and
* whether feature-local SQL remains possible.

It never penalises optional ecosystem features that the candidate did not need.
The candidate cannot edit the baseline manifest. A treatment may introduce
structure; the result records the associated guarantee rather than treating
the structure as automatically negative.

## X1 open-ended composition

One independent replicate per arm is a non-aggregate control. `runReport`
receives a bounded data request whose projection, optional join, predicates,
and grouping can vary together. The runner sends multiple frozen requests so
that a candidate cannot hard-code one report. The request vocabulary is
finite and validated by the runner; it is not arbitrary SQL supplied by the
runner or user.

The control records live behaviour, treatment fidelity, source visibility,
and the safety boundary used for dynamic identifiers. It does not claim that
finite maps are equivalent to a general report builder, nor does it make X1 a
primary-workload score.

## SD schema-drift detection

For each selected primary-success candidate, the runner first records a
baseline G1 pass and immutable candidate source hash. In separate fresh nonce
schemas it then performs exactly one database-only alteration at a time:

1. rename a referenced column;
2. make a referenced column non-null after data is compatible; or
3. change a referenced integer column to `bigint`.

No application source, package resolution, generated file, or candidate test
is changed. The runner records the first observable detection stage among
`typecheck`, `treatment-command`, `candidate-test`, `application-execution`,
and `runner-oracle`; `not-detected-in-measured-stages` is a valid observation.
The control does not rank compile-time detection above database-time detection.

## E1 exit/removal

For every arm with a strict-treatment, final-live G1 pass, select the candidate
with the fewest candidate/tool repairs; break ties by replicate 1. Copy its
durable snapshot to a separate exit candidate directory. The candidate then
removes the selected arm's main data-access treatment and retains the frozen
G1 behaviour using native `pg`. The original snapshot remains unchanged.

An arm with no strict-treatment G1 pass is recorded as `not-selected` rather
than replaced. The runner records changed source, deleted generated/config
state, replacement dependencies, commands, repairs, and final G1 result. It
does not interpret low exit cost as an overall advantage.

## Exclusions and fairness

A control is excluded only for the same preregistered conditions as a primary
cell: unavailable pinned dependency/binary, runner defect, or documented
permission/environment failure. A failed candidate is evidence, not an
exclusion. Candidates receive only their control packet, own allowed official
guidance, and their own baseline skeleton; they do not receive another arm or
replicate output, runner expected SQL, or a solution patch.

