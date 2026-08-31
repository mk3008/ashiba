# Preregistration amendment 1: execution protocol freeze

## Why this amendment exists

The initial preregistration commit `fce630efcd256474ad3dcaa66580ef8eded88b2a`
froze the research questions, arms, broad workload matrix, repair cap, and
non-aggregate analysis. Before any scored cell began, an independent review
found that the executable inputs, exact evaluator semantics, treatment packets,
repair feedback, and correction scope were not frozen enough for publication.

No scored candidate had started when this amendment was written. This amendment
is therefore the authoritative execution freeze. It preserves, rather than
rewrites, the initial preregistration.

## Fixed execution profile

Every scored cell uses the same Fresh-Agent model alias, reasoning effort,
filesystem permissions, network policy, shell, and 90-minute wall-clock
timebox. The runner records the actual model/build information if exposed;
otherwise it records `model-build: unavailable`. Time begins when the candidate
receives its packet and ends at timeout or the final allowed repair response.

Each cell has one initial response and at most two repairs. The candidate keeps
the same isolated session/context for repairs. A repair receives only the
candidate's own command/test/oracle failure category and an actionable failed
assertion; it never receives another arm's output, source, or solution. The
runner does not give hidden expected SQL or a patch. An unresolved third failure
is final. Repair burden includes candidate logic, API/tool misuse, type-system,
SQL, database-specific, generated-state, config, and install/dependency
repairs. Environment and harness incidents are reported, not counted as a
candidate/tool repair.

Cells run in interleaved arm order within each workload and replicate block;
the stored `execution-order.json` records the deterministic seed, order, and
timestamps. Results are descriptive `x/2` observations only. The benchmark
does not calculate a success-rate superiority estimate, a pooled cross-workload
score, or a statistical claim from two replicates.

## Frozen packages, artifacts, and information packets

The version identifiers in `MANIFEST.md` are package pins, not loose ranges.
Each arm's `package-lock.json`, all direct dependency versions, downloaded
binary/WASM/image digest, and the SHA-256 of every package/tarball/doc packet
must be committed under the fixture before the first scored cell for that arm.
If this cannot be done, that arm is an arm-wide availability outcome, not a
silent exclusion.

Ashiba is measured as a **baseline-local packed tarball supplied condition**:
`@ashiba-ts/named-parameters@0.1.0` built from baseline
`80779fbb383de968d00d21d5bf09f765fe536975`. It must not be described as an
npm-registry availability result unless a registry package is independently
verified. Prisma 7.10.0 is specifically the stable Prisma arm; the benchmark
does not generalize it to the evolving Prisma 8 RC/current workflow.

Before each cell, the candidate receives only its directory, the frozen common
prompt, its frozen arm packet, its own schema/acceptance packet, and installed
declared dependencies. The stored packet contains an arm's official README/docs
snapshot with URL, retrieval time, and SHA-256. The runner blocks direct access
to this repository, Git history, other candidate directories, prior output,
and prior repair reports. A documentation snapshot measures cold-start
documentation dependence and tool discoverability; it does **not** measure
training-data familiarity. Model familiarity is a recorded, unobserved
confounder, not a measured causal variable.

## Exact candidate protocol

The exact common prompt and arm deltas are committed under
`fixtures/current-ashiba-competitive-benchmark-v3/prompts/`. The candidate
must implement the exact TypeScript public contract in
`fixtures/current-ashiba-competitive-benchmark-v3/COMMON_API.md`, including
input/output/null/error semantics and `close()`. VSA and layered brownfield
starters contain their own pre-existing adapter; its file and fixed lines are
excluded from architecture scoring. The candidate may change only the listed
zone in each brownfield starter.

The candidate receives a role scoped to its single namespace and must configure
its connection to that namespace. It may not create or read objects outside it.
The runner provisions a least-privilege role where supported, sets statement
timeout and search path, and verifies final state with a separate runner
connection. Output transcripts and environment reports are redacted by the
fixed redaction rule before commitment; credentials are never committed.

## Oracle and safety protocol

The runner owns DDL/seed, all expected data, and all negative controls. It
never imports candidate SQL or tests as oracle inputs. Transaction rollback is
forced by a runner-owned database trigger/constraint after the debit/update,
not by a candidate-visible boolean that can be thrown before work starts. Q1
requires candidate-owned query execution and a candidate-owned `explain`
operation; the runner only independently validates returned behaviour and
collects plan evidence through the frozen entrypoint. The common API freezes
data representation, valid sort values, error semantics, pagination limits,
concurrent start barrier, and close behaviour.

Reference controls and deliberate negative controls must pass before scored
cells. A missing public export, hard-coded `public` reference, a fabricated
stdout pass, a wrong schema, leaked cleanup, or missing evidence is a runner
non-pass; it cannot be converted into a candidate success by inspection.

## Immutable evidence and corrections

Every attempt has a distinct immutable directory containing the pre-attempt
source hash, post-attempt source snapshot, exact prompt/packet hashes,
transcript/tool calls where available, command log, stdout/stderr, exit code,
timeout state, dependency lock, runner result, database final-state summary,
treatment review, and cleanup result. Evidence must be written and hashed
before database cleanup. Failure to preserve evidence pauses scoring.

A harness correction preserves original evidence and is committed separately.
If it changes the runner code path used by a workload, **all** replicates for
every arm that used that path (passed or failed) are affected and rerun. A
change to public API, task semantics, success assertion, or treatment policy is
a protocol version change, not a harness correction; old and new protocol
results are never combined. Registry outage is an environment incident; a
declared artifact that cannot be obtained is a reported arm availability result.

## Neutral interpretation limits

Q1 is expressly a PostgreSQL/SQL-mechanism-fit workload and cannot establish a
general ORM ordering. Architecture results measure required artifacts, change
zones, movement, configuration, generated state, and boundary violations,
alongside each tool's guarantees; they do not presume fewer structures are
better. The benchmark reports observed facts separately from inferences and
hypotheses.
