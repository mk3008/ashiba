# Driver Adapter Durable Ownership Evaluation

## Decision

**Overall: `REDUCE`.** Retain DBMS support and the named-parameter core, but do not retain the present driver-adapter package family as a permanent execution architecture.

| Surface | Decision | Boundary |
| --- | --- | --- |
| `@ashiba-ts/driver-adapter-mysql2` | REMOVE | native mysql2 plus named core/build metadata provide the observed execution path; no current product consumer exists |
| `@ashiba-ts/driver-adapter-mssql` | REMOVE | native mssql plus named core/build metadata provide the observed execution path; no current product consumer exists |
| `@ashiba-ts/driver-adapter-core` | REMOVE / split residual types only where independently needed | it combines application architecture, retry, logging, cardinality, query source, and metadata types; most are outside current Ashiba ownership |
| `@ashiba-ts/driver-adapter-pg` ordinary execution wrapper | REMOVE | Ticket Queue already demonstrates named core + native pg without the wrapper |
| PostgreSQL metadata freshness and binding preparation | REDUCE | build-time `model-gen --check` remains the primary freshness owner; a future narrow runtime guard requires separate evidence |
| Safe sort runtime | REDUCE | existing ablation classifies its runtime packaging as Rule Only, not minimum/core proof |
| Optional-condition compression | KEEP OPTIONAL / productization pending | existing ablation found useful early stale-metadata proof, but not a reason to retain the whole adapter package |
| PostgreSQL contract facts | KEEP OPTIONAL, outside adapter | standalone CLI contract already owns this responsibility |

This is an ownership result, not a removal implementation. DBMS positioning is unchanged: PostgreSQL is PRIMARY; MySQL/mysql2 and SQL Server/mssql remain SUPPORTED-SECONDARY. Native drivers remain the execution owner.

## Why

The MySQL and SQL Server adapters mechanically perform: source-hash comparison, `bindNamedParameters`, observer events, and one native-driver call. Their named-parameter and generated-binding work duplicates settled core or build-time responsibilities. The runtime source-hash comparison is a real fail-closed check, but it is small, reconstructible application glue and has not demonstrated a reason to own a public adapter package. Both packages have no repository product consumer beyond their own tests, docs, package graph, and compatibility matrix.

The PostgreSQL adapter contains a larger deterministic transformation surface. Its optional-condition implementation rejects stale range text before constructing SQL, and its safe-sort path rejects unresolved/stale metadata. These capabilities cannot be discarded merely because an execution wrapper is reducible. However the existing Dynamic Mechanism Value Ablation establishes that safe-sort is Rule Only and optional compression is an optional early proof. Neither justifies Ashiba retaining observer, retry, feature-executor, cardinality, and general execution-wrapper architecture.

## Scope verdict

Scope verdict: `implementation-choice`.

Affected boundary: optional deterministic preparation around native drivers. Current Scope permits bounded optional adapters but makes native drivers the baseline and assigns connection lifecycle, transactions, retries, logging, DTOs, and application architecture to applications. Observed package shape exceeds that narrow boundary in several places. Recommended next action: plan a capability-preserving reduction, not a DBMS support reduction.

See [capability ledger](CAPABILITY_OWNERSHIP.md), [native contrast](NATIVE_DRIVER_CONTRAST.md), and [decision](DRIVER_ADAPTER_DECISION.md).
