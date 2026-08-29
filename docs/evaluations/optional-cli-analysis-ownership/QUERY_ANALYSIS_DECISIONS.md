# Query Analysis Family Decisions

## `query uses table` and `query uses column`: KEEP

This is the family’s retained optional capability. It parses discovered query
catalogs and their SQL, analyzes table/column usage with AST evidence, and
emits structured confidence/fallback/unresolved information. By default an
AST parse failure fails the operation; fallback requires the caller to opt in.

Focused current-source evidence used Support Inbox and found four
high-confidence references to `public.tickets` across seven discovered
catalogs/statements. A fixture containing `select from;` failed with
`ASHIBA_QUERY_USES_AST_PARSE_FAILED` instead of silently presenting an
incomplete report.

This does not prove SQL semantic correctness, and it is not part of the
Golden Path. It is a narrowly retained optional inspection capability for
repository-wide impact analysis where grep/AI candidate search cannot make the
same deterministic completeness claim.

## `query outline` and `query graph`: REMOVE

Both commands expose CTE/table dependency information from the same parser
family, but their output is explanatory. The Support Inbox query produced a
useful six-CTE outline and DOT graph; neither command rejected a source
failure, generated a consumed contract, or had a current executable consumer.

An AI, editor, or general AST/graph tool can reconstruct a one-query
explanation on demand. Maintaining dedicated graph formats and command
semantics is not justified.

## `query slice`: REMOVE

`query slice` creates debug SQL from a selected CTE dependency closure. It is
helpful during investigation, but it neither executes the result nor proves it
preserves the application query’s semantics. A user must still validate it
with native DB/application tools. This makes it reconstructible application
debugging convenience, while the transformation itself creates a parser and
output-compatibility maintenance obligation.

## Follow-up boundary

A future implementation should retain the common AST portions demonstrably
needed by `query uses`; remove structure/graph/slice commands and helpers that
have no retained consumer; and add focused regression coverage for the
retained strict parse/fallback behavior. It should not introduce a replacement
reporting framework or make `query uses` a default verification requirement.
