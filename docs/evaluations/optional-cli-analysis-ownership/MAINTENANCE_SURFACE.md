# Maintenance Surface Assessment

The optional analysis family carries public command registration and catalog
entries, CLI option parsing, AST/parser compatibility, output schemas and
renderers, source traversal, documentation, fixtures, and the expectation
that a published CLI result remains meaningful as SQL syntax evolves.

| Retention direction | Ongoing surface | Durable justification |
| --- | --- | --- |
| Keep `query uses` | Catalog discovery, AST usage analysis, strict fallback policy, JSON/text output, parser regression coverage | Yes: reproducible impact inspection with default fail-closed incompleteness handling |
| Keep narrow DDL lint | DDL model loading and explicitly supported static checks | Yes, but only for demonstrated DDL-reference/literal mismatch checks |
| Keep formatter | Format config, guarded write behavior, documentation, parser/formatter drift | No independent Golden Path dependency or evidence of Ashiba-specific failure prevention |
| Keep advisory query lint | Rule taxonomy, false-positive policy, parser support, docs and fixtures | No: review advice is cheaply reconstructible and not fail-closed in the evaluated use |
| Keep outline/graph/slice | Structure models, graph/text schemas, slice transform compatibility, docs | No: report/debug representations are not authority and have no current workflow consumer |

The proposed reduction is not based on LOC or command count. It removes
maintenance promises whose value is primarily information presentation while
preserving the two surfaces where current evidence demonstrates early,
mechanical, reproducible value.

## Compatibility

Formatter, query-lint, outline, graph, and slice removal would be deliberately
breaking public CLI changes. A future implementation must publish a concise
migration note: use an editor/general formatter for formatting, project/AI
review for advisory diagnostics, and native DB/application tests for debug
SQL. No compatibility aliases or hidden commands are justified by this
evaluation. Retained `query uses` and narrow DDL lint do not require a
canonical SQL or named-binding migration.
