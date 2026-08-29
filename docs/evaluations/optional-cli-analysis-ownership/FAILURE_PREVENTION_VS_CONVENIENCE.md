# Failure Prevention Versus Convenience

| Capability | Deterministic behavior observed | Failure prevention | Final authority | Convenience / reconstructibility | Decision implication |
| --- | --- | --- | --- | --- | --- |
| Formatter | Reparse/AST-equivalence and comment-preservation checks prevent an unsafe write | Prevents a formatter from overwriting a comment-unsound rewrite; not a SQL correctness proof | SQL parser and application tests | General SQL formatter/editor/AI can produce a formatting proposal; review can decide whether to accept it | Safety guard is real but does not justify a permanent Ashiba formatting workflow |
| DDL-aware lint | Finds missing DDL table/column references and some literal type mismatches before execution | Narrow static integrity guard | DDL + canonical SQL; application/live tests for semantics | AI/grep can investigate, but cannot guarantee repository-wide static checks in one reproducible fail-closed command | Retain the narrow DDL checks |
| Query lint | Reports unused CTE, duplicated patterns, templating risk, large CTE, and join-direction advice | Advisory only in representative run; standalone `query lint` exits successfully with warnings | Review and application tests | High: AI, editor, grep, or a project-local script can generate equivalent advice | Remove the advisory family |
| Uses | AST-first discovery reports exact/high-confidence references; parser failure is an error unless fallback is explicitly requested | Detects incomplete analysis rather than silently claiming exhaustiveness | SQL source plus human review; not semantic execution proof | AI/grep can find candidates, but cannot make the same coverage/fallback claim without rebuilding the analysis | Retain as a narrow optional mechanical inspection tool |
| Outline / graph | Deterministic CTE/table summaries and renderings | No source failure was rejected; explanatory only | Reader/reviewer | High: AI and general AST/graph tooling can produce a representation on demand | Remove |
| Slice | Deterministically composes a debug query from selected CTE closure | No proof that produced SQL preserves application behavior; user must execute/test it | Native DB/application test | High: AI/DB client/project-local debug SQL can recreate it; transformed output adds maintenance risk | Remove |

## Focused evidence

The formatter fixture contained a line comment. `query format` reported
`safe: false` and refused a write because formatting would drop that comment;
`--check` exited nonzero. This proves a local write-safety guard, not a
canonicalization or freshness dependency.

The DDL fixtures made `lint` fail nonzero for a missing column and a literal
insert type mismatch. A representative named parameter conflict was accepted,
so the retained DDL check must not be described as a complete SQL semantic or
parameter type proof.

For `query uses`, a current Support Inbox query corpus produced four
high-confidence matches for `public.tickets` across seven discovered
catalogs/statements. An intentionally unparsable SQL file produced
`ASHIBA_QUERY_USES_AST_PARSE_FAILED` and nonzero exit by default. This is the
strongest observed distinctive failure-prevention behavior in the family.

`query lint` reported an unused CTE in the fixture but exited zero. Its
diagnostics therefore remain review information when used directly, rather
than a fail-closed product gate.
