---
title: Versioned AI-derived artifact operations audit
---

# Versioned AI-derived artifact operations audit

## Decision

**Hybrid, with a Partial productization recommendation.** In the evaluated
query form, AI-derived G3 optional segments and G4 finite-sort policy can be
operated as small, per-query versioned assets. G1 remains a deterministic
Ashiba-owned calculation. G2 source identity and G5 composition are also
deterministic at build/runtime: the artifact supplies reviewed facts, while the
small verifier and runtime consume them without AI.

This is evaluation-only. No production schema, public API, CLI, product
generator, or runtime was changed.

## Models compared

| Model | Build input | Result |
| --- | --- | --- |
| O0 deterministic owned generator | Canonical SQL only, then one generated/global artifact. | Correct deterministic baseline, but an actual different-query branch test produced a conflict in its one global manifest. |
| O1 versioned derived asset | Canonical SQL + requirements + per-query committed metadata; small verifier and deterministic runtime. | Accepted for the evaluated shape: clean/offline checkout, Fresh Agent repair, negative controls, Git merge behavior, and PostgreSQL runtime passed. |
| O2 build-time AI | SQL + requirements but no committed derived asset. | Rejected early. A clean build has no deterministic G3/G4 input and must call an external AI service; verifier fails closed with `O2_REJECTED`. |

The durable protocol, commands, and raw records are in
[`fixtures/versioned-ai-artifact-operations`](./fixtures/versioned-ai-artifact-operations/README.md).

## Operating contract

The O1 artifact stores only `sourcePath`, `sourceHash`, exact optional segment
range/text, and finite sort anchor/key policy. It does not store lowered SQL or
ordered bind names. `g1-lower.mjs` calculates G1 each time from canonical SQL.
The verifier checks only registered paths, missing/orphan assets, hash, stored
range/text, and sort anchor/key shape. It does not parse SQL to discover ranges,
infer policy, or generate an artifact.

Consequently, an AI agent may use temporary private tooling to update an
artifact, but the committed state required by a clean build is only SQL,
requirements, and the reviewable per-query JSON. No hidden service, old
worktree, network call, or persistent generation program is needed by O1.

## Brownfield, stale, and Fresh Agent evidence

The [Brownfield results](./fixtures/versioned-ai-artifact-operations/brownfield-results.md)
cover parameter-order derivation, optional range addition, formatting drift,
sort-policy changes, rename/orphan detection, metadata-only policy change, and
SQL-only stale state. Negative controls prove stale hash, missing source,
orphan asset, invalid range text, and sort-anchor mismatch all fail closed;
runtime refuses stale metadata.

Two independent Fresh Agents received only normal change requests—not a
directive to update artifacts. One added optional date bounds; the other
renamed a query. Both used normal verification feedback to repair local
metadata without human coordinate/hash synchronization and passed the fixture
test. The exact limits and outcomes are in the
[Fresh Agent ledger](./fixtures/versioned-ai-artifact-operations/fresh-agent-ledger.md).
This establishes practical repair behavior for two cases, not a universal
agent-reliability guarantee.

## Repository operation and reproducibility

An actual Git test found that O0's compact global manifest conflicted for two
different query changes, whereas the O1 per-query case auto-merged with zero
conflicts. Two concurrent changes to the same SQL file conflicted in that SQL
file only; the artifact added no excess conflict. See
[merge-conflict results](./fixtures/versioned-ai-artifact-operations/merge-conflict-results.md).
Normal commits, checkout, and revert are sufficient to version O1 because SQL
and its matching metadata travel in the same Git history.

A new clone passed O1 verifier and fixture tests, `pnpm install --offline
--frozen-lockfile` with zero downloads, workspace build, and the dedicated
PostgreSQL runtime checks. The recorded outcome is in
[clean-clone results](./fixtures/versioned-ai-artifact-operations/clean-clone-results.md).

## Direct answers

* **Can derived artifacts be versioned safely?** Yes for this bounded contract,
  provided per-query assets, a fail-closed verifier, and normal build/test/live
  gates are retained.
* **Can AI use temporary tooling while committed artifacts are durable?** Yes.
  O1's clean clone contains no agent tooling requirement; only the durable
  artifact and deterministic consumers are needed.
* **Do developers need to hand-manage hash, coordinates, or freshness?** The
  two normal-task replicates did not. They repaired through verification
  feedback. The guard is essential: it makes a missed update loud rather than
  silently acceptable.
* **Which form merges better?** Per-query artifacts. A global artifact was a
  real avoidable conflict point for otherwise independent edits.
* **Is O2 appropriate?** No: it sacrifices reproducibility and offline build
  determinism for a build-time external dependency.
* **Is a human blocker present?** No blocker to this evaluation or to retaining
  the component Hybrid. A human product decision remains required before
  promotion: define the supported SQL/optional/sort corpus, establish review
  ownership for requirement changes, and run a broader sandboxed reliability
  study. The temporary PostgreSQL service was an environment prerequisite, not
  a human coordination blocker.

## Next decision

Keep G1 deterministic and treat versioned AI-derived G3/G4 metadata as a
candidate operational pattern only. Do not remove an owned generator or change
product behavior from this study. Fund a larger corpus with independent,
sandboxed agents and semantic PostgreSQL oracles before productizing the
artifact contract.
