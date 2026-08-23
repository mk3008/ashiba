---
title: AI artifact-generation feasibility audit
---

# AI artifact-generation feasibility audit

## Decision

**Partial — C is supported for the evaluated G2--G4 derivation and Brownfield
regeneration. Retain B for G1 named lowering until a broader corpus and
sandbox-enforced Fresh Agent study exists.** This PR is evaluation-only: no
product generator, runtime, or public API changed.

## Inputs and treatment

The durable fixture is
[`fixtures/ai-artifact-generation`](./fixtures/ai-artifact-generation/README.md).
It freezes the v1 artifact schema, ordinary SQL workloads, application
requirements, small verifier, and runner. C packets give Fresh Agents only
those inputs and forbid product generator source, B artifacts, old coordinates,
and other candidates. Temporary tooling may be private; candidate directories
retain only artifacts. The control is procedural, not a filesystem sandbox.

The B observation calls current `runModelGen`; its generated metadata, timing,
dependency and source-surface record are in
[`b-baseline/results.json`](./fixtures/ai-artifact-generation/b-baseline/results.json).
It succeeded for W1--W4, but returned no optional-compression branches for this
three-state form. This is a capability/effort baseline, not an expected-artifact
oracle.

The first C pilot was excluded after the evaluator found its own ambiguous CASE
requirement and invalid quoted identifier. The valid round used corrected
ordinary SQL and a fixed schema.

## Results

| Workload | Valid C evidence |
| --- | --- |
| W1 named lexical | 2/2 direct native PostgreSQL passes: repeated name, casts, literals, quoted identifier, line/nested comments, dollar quote, escape string |
| W2 optional search | 2/2 passes: LEFT JOIN; omitted/null/value; subtraction; pagination; ordered values |
| W3 sort | 2/2 passes: three finite keys, multi-column composition, stable tie-breaker |
| W4 mixed query | 2/2 passes: CTE, JOIN, optional ranges, sort splice, pagination, formatting noise |
| M1--M5 Brownfield | 2/2 generated all artifacts and passed PostgreSQL: parameter reorder, added optional, formatting drift, changed CASE, CTE/JOIN change |

Greenfield replicate-6 was first-pass structural/live success. Replicate-5
passed the small verifier first but one hidden live run exposed malformed
present-replacement text; one repair then passed all 9 live checks. Brownfield
replicates 7 and 8 were first-pass successes. The runner-owned submission and
repair record is `fixtures/ai-artifact-generation/dispatch-ledger.jsonl`;
live results are in `live-oracle-results/` and `brownfield-live-results/`.

The two valid artifacts are not byte-identical: their edit ranges differ in
whitespace ownership. Both are locally valid and have identical tested behavior,
so byte equality is intentionally not required.

## G1--G5 decision

| Responsibility | Decision | Evidence and limit |
| --- | --- | --- |
| G1 named lowering | **B retained / C promising** | Two Fresh Agents lowered W1 correctly, but this is too small to replace durable lexical regression coverage. |
| G2 sourceHash | **C** | Fresh artifacts generated hashes; stale-hash control fails closed. |
| G3 optional ranges | **C for evaluated form** | Two Greenfield and two Brownfield regenerations passed; one live-only repair demonstrates why test gating remains required. |
| G4 sort coordinate | **C for finite reviewed sorts** | Anchor checks, multi-sort/CASE behavior, and M4 reverse ordering passed. |
| G5 combined artifact | **C for evaluated contract** | Subtraction, renumbering, sort splice, and direct pg behavior passed; broader corpus is still needed. |

## Verifier and negative controls

The verifier does not lower names, parse SQL, rediscover optional branches, or
recompute sort coordinates. It checks only source hash, registered path, local
range bounds/text/non-overlap, placeholder count/sequence, marker/name
consistency, and sort anchor/finite-key shape.

All nine mechanical corruptions failed closed: stale hash, ±1 range,
out-of-bounds range, mismatched text, overlap, missing ordered name, invalid
placeholder sequence, and out-of-source sort insertion. Two locally valid
semantic mutations passed the verifier but failed PostgreSQL behavior: a reverse
business CASE and a wrong optional control. Results are in
`fixtures/ai-artifact-generation/negative-control-results/`.

The gate therefore remains **small verifier + application/live oracle**. The
verifier has not become a generator in disguise.

## Answers and next decision

- Dedicated generation is not needed for evaluated G2--G4; G1 should remain
  deterministic until a broader lexical study proves C stability.
- AI plus private temporary tooling reproduced Greenfield and Brownfield
  artifacts without persistent candidate generator code or human coordinate
  synchronization.
- Exact agent start timestamps, token counts, and full tool-call counts were
  not available from this dispatcher. Do not claim an economic conclusion about
  agent cost; run the next study with sandboxed inputs and those runner metrics.

Keep product behavior unchanged. The next human decision is whether to fund that
broader, sandbox-enforced G1 study before making any productization decision.
