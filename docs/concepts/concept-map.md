# Concept Map

This page is the current-product review index for Ashiba. Historical
evaluations preserve removed surfaces separately; they are not current product
instructions.

## Product boundary

Ashiba is a Builder Mapper primitive, not an ORM, query builder, architecture
framework, migration tool, or test runner. The current product is the
driver-neutral `@ashiba-ts/named-parameters` package:

```text
visible canonical SQL
→ compileNamedParameters
→ bindNamedParameters
→ native driver
→ application/live tests
```

The application owns SQL loading and caching, result mapping, pools,
transactions, logging, migrations, deployment, business semantics, and
application tests. Dynamic SQL syntax is application-owned and may only be
selected from a closed, reviewed, source-controlled literal set.

## Core concepts

| ID | Display name | Status | Notes |
|---|---|---|---|
| `ashiba` | Ashiba | current | A small SQL-first Builder Mapper primitive. PostgreSQL is the primary runtime evidence path; MySQL and SQL Server remain supported secondary rendering targets. |
| `visible-sql` | Visible SQL | current | Canonical SQL remains readable, reviewable, editable, and searchable. |
| `named-parameter-binding` | Named Parameter Binding | current | Named parameters lower deterministically to the selected driver's placeholders while values remain separate from SQL text. |
| `parameter-contract-check` | Parameter Contract Check | current | The binder rejects missing and unused parameter names before execution. |
| `native-driver-boundary` | Native Driver Boundary | current | Native drivers own execution; Ashiba does not acquire connections or manage runtime policy. |
| `application-semantic-ownership` | Application Semantic Ownership | current | Applications own domain behavior, result mapping, transactions, migrations, and live tests. |
| `finite-reviewed-syntax` | Finite Reviewed SQL Syntax | current | Application code may choose source-controlled SQL literals after validating a finite public input. |
| `no-ai-behavior-file-distribution` | No AI Behavior File Distribution | current | Ashiba does not generate or install agent behavior files. Documentation may provide an invariant-focused sample. |

## Integration boundary

| Owner | Responsibility |
|---|---|
| Ashiba | `compileNamedParameters`, deterministic driver rendering, and `bindNamedParameters` validation. |
| Native driver | Parameterized execution and database protocol behavior. |
| Application | SQL loading/caching, connection and pool lifecycle, transactions, logging, mapping, dynamic policy, migrations, and behavioral tests. |
| External tools | Schema management, deployment, CI setup, and any optional SQL analysis. |

## Review checks

- Canonical SQL is ordinary target-dialect SQL and remains visible.
- Application values use named parameters and are never interpolated into SQL
  syntax.
- Missing and unused parameters fail before the native driver call.
- Native drivers remain the execution owners.
- Applications own optional filters, finite sort mappings, transactions,
  rollback policy, migration application, and semantic proof.
- Ashiba does not prescribe application architecture or a CLI workflow.
