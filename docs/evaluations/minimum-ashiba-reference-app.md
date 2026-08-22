# Minimum Ashiba reference application evaluation

## Status

**partial — greenfield plus all six timebox-controlled Brownfield E2E cells
passed; human acceptance of the reviewer packet remains required.**

## Why this follows PR #62

PR #62 narrowed its conclusion: it did not test three-state optional input,
business-defined ordering, or a changing application. This evaluation uses the
post-audit candidate boundary as input and asks whether it forms a usable
ordinary PostgreSQL application without requiring product-specific pattern
names. It does not remove or deprecate product features.

## What was constructed

The [durable fixture](./fixtures/minimum-ashiba-reference-app/README.md) is a
work-item application with visible SQL assets, `pg`, a small named lowering
helper, application-owned pool/transaction logic, `FOR UPDATE SKIP LOCKED`, and
JSONB audit context. Its requirements explicitly distinguish omitted, null,
and concrete optional values, and bound the ordering capability to three
business-defined choices including a CASE priority order.

## Architecture summary

> A Minimum Ashiba application can be a local feature facade that selects among
> complete reviewed SQL files, binds named values through a mechanical helper,
> and owns pool, transactions, and business policy in ordinary application
> code. SQL carries query meaning; the application carries input semantics and
> finite capability choices; the database carries concurrency and PostgreSQL
> behavior.

## Evidence and limits

The [reference E2E result](./fixtures/minimum-ashiba-reference-app/results.json)
records 21 live PostgreSQL checks. The runner, rather than source inspection,
is authoritative for application behavior. Source inspection is deliberately
narrow and cannot prove the absence of all possible dynamic construction.

Six Fresh-Agent Brownfield cells changed this same application by adding a
three-state filter, changing CASE business ordering, and renaming a result
field. All six pass the expanded independent oracle; see the task files for
[three-state filtering](./fixtures/minimum-ashiba-reference-app/brownfield-assignments/optional-state.md),
[business ordering](./fixtures/minimum-ashiba-reference-app/brownfield-assignments/priority-order.md),
and [the rename](./fixtures/minimum-ashiba-reference-app/brownfield-assignments/summary-rename.md),
[dispatch ledger](./fixtures/minimum-ashiba-reference-app/evidence/brownfield-dispatch-ledger.md),
and [results](./fixtures/minimum-ashiba-reference-app/brownfield-results.json).

## Current inference

The candidate boundary was sufficient for the registered application and these
three local changes. The successful agents used complete SQL and finite asset
selection; no result requires a product-specific pattern name. This is not a
claim that any current product facility lacks value. The next phase may assess
reduction candidates, but this phase only identifies them for discussion.
