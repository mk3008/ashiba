---
title: Versioned AI-derived artifact operations audit
---

# Versioned AI-derived artifact operations audit

## Decision

**Hybrid, with a Partial productization recommendation.** The corrected,
marker-free holdout supports G4 as a per-query versioned AI-derived placement
asset for the evaluated form. G1 named-parameter lowering remains deterministic;
G2 source identity/hash is deterministically checked; G3 optional ranges remain
a candidate derived asset; and the runtime is mechanical only.

This is evaluation-only. No product schema, public API, CLI, generator, or
production runtime changed.

## Protocol correction

The original O1 fixture used `/* @sort:... */` comments in canonical SQL.
That result is retained as **marker-assisted calibration** only. It still
supports per-query operation, stale/orphan rejection, Fresh-Agent repair,
clean-clone operation, and rejection of build-time AI. It is not final G4
evidence because it reduced placement to marker discovery.

The corrected holdout is
[`fixtures/versioned-ai-artifact-operations/marker-free-g4`](./fixtures/versioned-ai-artifact-operations/marker-free-g4/README.md).
Its canonical source is complete ordinary SQL with no project marker, directive,
or DSL. The observed problem, original assumption, consequence, correction, and
previous-evidence validity are recorded in its
[decision log](./fixtures/versioned-ai-artifact-operations/marker-free-g4/protocol-correction.md).

## Corrected operating contract

The application owns ordinary ordering policy code: reviewed key expressions,
ASC/DESC forms, CASE business ordering, maximum count, ordered composition, and
stable tie breaker. Runtime accepts only key/direction selections and never
accepts a raw SQL fragment.

The G4 derived artifact stores no sort semantics. It contains only source path,
source hash, an insertion index, expected text, and local before/after context.
The verifier checks registration/orphans, source existence and hash, index
bounds, stored text, and local context. It does not parse SQL, locate `ORDER
BY`, infer a tie breaker, infer a policy, or regenerate a coordinate. Runtime
mechanically splices application-selected reviewed expressions, then performs
deterministic G1 lowering.

## O0/O1/O2 comparison

| Model | Build input | Result |
| --- | --- | --- |
| O0 deterministic owned generator | Canonical SQL only, then one generated/global artifact. | Deterministic baseline, but an actual different-query branch test conflicted in its one global manifest. |
| O1 versioned derived asset | Canonical SQL + requirements/application policy + per-query committed placement metadata; small verifier and deterministic runtime. | Accepted for the evaluated form: marker-free Fresh-Agent repair, stale controls, clean/offline checkout, Git operation, and PostgreSQL runtime passed. |
| O2 build-time AI | SQL + requirements but no committed derived asset. | Rejected: an AI service is an unreproducible clean-build dependency. |

## Corrected G4 evidence

Native PostgreSQL passed single-key, two-key direction-mixed CASE ordering,
three-key composition, and no-request stable-tie-breaker behavior. Invalid
direction, duplicate key, excessive key count, unknown key, and hostile
raw-SQL-looking input fail before execution. The full result is in
[marker-free Brownfield results](./fixtures/versioned-ai-artifact-operations/marker-free-g4/brownfield-results.md).

Two independent Fresh Agents received ordinary SQL maintenance requests only:
one formatting/comment change and one structural CTE refactor. Neither received
a marker coordinate or hidden answer. Both refreshed stale placement metadata
through ordinary verifier/test feedback; runner-owned offline setup and native
PostgreSQL then passed 5/5 checks for each. Human coordinate editing was zero.
See the [Fresh Agent ledger](./fixtures/versioned-ai-artifact-operations/marker-free-g4/fresh-agent-ledger.md).

An application-only policy commit added a reviewed business-order key while
changing no placement artifact; test passed and Git named only the policy file.
This demonstrates the intended separation between business semantics and a
placement fact.

A new clone passed offline install with zero downloads, marker-free verifier,
fixture tests, workspace build, and 5/5 native PostgreSQL checks without AI.
See [marker-free clean-clone results](./fixtures/versioned-ai-artifact-operations/marker-free-g4/clean-clone-results.md).

## Previously established evidence retained

The prior fixture's per-query assets auto-merged for independent queries while
a global manifest conflicted. Same-SQL concurrent edits conflicted in canonical
SQL without an excess artifact conflict. Its verifier rejected stale source,
missing source, and orphan assets. Its clean-clone check passed offline install
with zero downloads and a PostgreSQL live run. These claims are independent of
marker-free G4 semantics and remain in the fixture's
[merge results](./fixtures/versioned-ai-artifact-operations/merge-conflict-results.md)
and [clean-clone results](./fixtures/versioned-ai-artifact-operations/clean-clone-results.md).

## Final responsibility placement

| Responsibility | Decision |
| --- | --- |
| G1 named-parameter lowering | Deterministic processing where a native driver does not already provide it |
| G2 source identity/hash | Deterministic local calculation/check |
| G3 optional-condition placement/ranges | Per-query versioned AI-derived candidate |
| G4 sort placement coordinate | Per-query versioned AI-derived candidate, supported by marker-free holdout |
| Sort semantics | Ordinary application code/configuration |
| Verifier | Small deterministic local checks |
| Semantic authority | Application and native PostgreSQL live tests |
| Build-time AI | Rejected |

## Limits and next decision

This supports the evaluated contract, not every SQL dialect or query shape.
Before productization, choose a supported corpus, define review ownership for
application policy/requirements, and run a broader sandboxed reliability study.
Do not remove an owned deterministic mechanism or change product behavior based
on this evaluation alone.
