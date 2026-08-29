# Optional CLI Analysis Surface Durable Ownership Decision

## Decision: REDUCE

Ashiba should retain only two optional analysis responsibilities:

1. `query uses table` / `query uses column` as AST-first, repository-wide,
   fail-closed-by-default impact inspection.
2. The narrow DDL-backed static mismatch checks currently mixed into `lint`.

Ashiba should remove the optional `query format`, advisory `query lint`,
`query outline`, `query graph`, and `query slice` surfaces in a separate
implementation PR.

## Why

The retained capabilities have a deterministic result that is difficult to
replace with ordinary AI/grep alone:

- `query uses` records AST coverage and refuses parse-incomplete analysis by
  default. It supplied high-confidence current Support Inbox usage matches and
  rejected an invalid SQL negative control.
- DDL-aware lint deterministically caught selected missing-column and literal
  type mismatch errors before execution.

The removed capabilities mainly format, summarize, visualize, advise, or
construct investigation SQL. Their output is not final authority, has no
current executable consumer or Golden Path dependency, and can be recreated by
AI, SQL editors, native DB tools, or a project-local script. Their continued
CLI/parser/docs/schema maintenance is not justified.

## Scope and Golden Path

Scope change required: **no**.

Golden Path changed: **no**.

This remains the product path:

```text
canonical SQL
→ deterministic binding metadata
→ bindNamedParameters
→ native driver
→ optional PostgreSQL contract
→ application/live tests
```

The retained analysis commands remain explicitly optional; standard verify and
CI do not call them and this evaluation does not propose making them gates.

## Compatibility and implementation boundary

Removal is a deliberate public CLI breaking change. A future implementation
must provide a short migration note, remove catalog/docs promotion, remove
orphan code/tests/config, and avoid compatibility aliases or a replacement
analysis framework. It must preserve `SqlFormatter` operations independently
required by retained DDL/result processing.

The future implementation should add direct tests for retained `query uses`
strict parsing/fallback and retained DDL lint errors before deleting the
current family’s indirect coverage.

## Evidence strength and limitations

Evidence strength: **medium**.

Strengths: source-level consumer/dependency census; current Support Inbox
corpus exercise; focused positive controls; AST parse negative control;
formatter comment-safety control; direct comparison of deterministic behavior
against convenience-only reports.

Limitations: no external adoption census; no fresh independent-agent timing
experiment; no direct pre-existing test suite for the optional family; a
single current corpus and small fixtures rather than a broad SQL corpus.

## Reconsideration triggers

Reopen a removed capability only with concrete evidence that it prevents a
repeated, material failure unavailable through the retained guards/native
tools/application tests, or that multiple independent current product
consumers require a stable machine-readable cross-query contract. Convenience,
existing code, and a desire for a prettier report are not triggers.

Reconsider `query uses` only if its strict AST coverage/fail-closed property
is removed, no current product corpus needs cross-query impact inspection, or
the same property becomes reliably available from a supported lower-level
tool without Ashiba-owned semantics.
