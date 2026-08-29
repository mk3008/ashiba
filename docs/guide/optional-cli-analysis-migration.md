---
title: Optional CLI Analysis Migration
---

# Optional CLI Analysis Migration

Ashiba no longer provides these optional commands:

- `ashiba query format`
- `ashiba query lint`
- `ashiba query outline`
- `ashiba query graph`
- `ashiba query slice`

This is a deliberate breaking reduction. Ashiba does not provide compatibility
commands or a replacement analysis framework.

## Continue using

`ashiba query uses table` and `ashiba query uses column` remain available for
AST-first, repository-wide impact inspection. They fail closed on SQL AST parse
errors by default. `--allow-parser-fallback` is an explicit low-confidence
fallback, not equivalent AST evidence.

`ashiba lint <path> --ddl-dir <path>` remains available only for narrow,
mechanically decidable checks against an explicit DDL model, including missing
table or column references and obvious literal/DDL type mismatches. It does not
validate parameter semantics or business behavior.

## Move removed workflows to the application

- Format SQL with an editor, a general SQL formatter, or an AI-assisted diff.
- Handle advisory lint feedback through code review, editor diagnostics, and
  application policy.
- Inspect a query outline or relationship graph on demand with an editor, AST
  tool, or AI.
- Use native database tooling or project-local debug SQL for query slicing.

These alternatives are application-owned. Canonical SQL, named binding
metadata, native driver execution, optional PostgreSQL contracts, and
application/live tests are unchanged.
