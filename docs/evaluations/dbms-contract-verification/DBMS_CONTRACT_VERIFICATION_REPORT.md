# DBMS Contract Verification Evaluation

## Decision

**Cross-DBMS classification: `postgres-only-remains-rational`.**

The current PostgreSQL standalone contract is a complete mechanical path: canonical SQL is prepared without execution, PostgreSQL supplies parameter and result types, the contract records the selected `pg` representation, and the existing checker rejects stale SQL plus missing, extra, and mismatched manual TypeScript fields. Live DML description left zero rows.

SQL Server has a strong server-native result-description primitive, but no equally reliable parameter derivation for the required repeated-name slice. MySQL's protocol returns useful prepare metadata, but mysql2's public promise surface does not expose it; reaching it required `connection.connection`, a driver-internal surface. Neither outcome justifies expanding Ashiba's minimum core now.

This is an evaluation only. No product code, API, CLI, Scope, dependency, runtime parser, generic provider, driver abstraction, starter, or testkit was added.

## Live method

The same isolated customers/tickets slice ran on PostgreSQL 18.1 + pg 8.21.0, MySQL 8.4.11 + mysql2 3.15.3, and SQL Server 2022 + mssql 11.0.1. It included a get, join, repeated optional parameter, nullable result, insert, and update. The executable evidence is [evaluation/run.mjs](evaluation/run.mjs); its live output is [raw-results.json](raw-results.json). The harness creates only `ashiba_contract_eval_*` tables and drops them in `finally` blocks.

## Classification

| DBMS | Classification | Best observed strategy | Why not a core implementation now |
| --- | --- | --- | --- |
| PostgreSQL / pg | `native-contract-natural-fit` | native-static-describe | Existing complete path, including manual TypeScript comparison and stale rejection. |
| SQL Server / mssql | `native-contract-small-gap` | `sp_describe_first_result_set` | Result types/names/nullability and DML non-execution work, but `sp_describe_undeclared_parameters` fails on repeated `@status`; a full parameter proof needs additional DB-specific policy. |
| MySQL / mysql2 | `not-worth-owning` | internal prepare-only observation | The public mysql2 promise `prepare()` hides metadata. `connection.connection` exposes protocol fields but is a driver-internal ownership boundary. |

The cross-DBMS result is not `verify-needs-db-specific-thin-lanes`: a SQL Server result-only lane would be mechanically useful but does not satisfy the complete parameter/result/manual-TS proof, while a MySQL lane would increase driver-internal maintenance. Keeping the PostgreSQL-only full verifier therefore preserves the smaller, more valuable core.

## Mechanical facts

| Fact | PostgreSQL | SQL Server | MySQL |
| --- | --- | --- | --- |
| Parameter names | canonical generated names + prepared metadata | generated names; native inference only for simple single use | generated occurrence names only |
| Parameter SQL types | proven by prepared statement catalog | inferred for a single occurrence; repeated variable rejected (11508) | available only through mysql2 internal prepare response |
| Result names/types | proven | proven by `sp_describe_first_result_set` | available only through mysql2 internal prepare response |
| Nullable metadata | recorded only when known; this isolated SQL was `unknown` | returned as `is_nullable` | protocol flags, not a small public contract surface |
| DML application execution | no | no | no during prepare, but no acceptable public metadata lane |

For SQL Server, `sp_describe_first_result_set` described all six SELECT result columns, including `bigint`, `nvarchar(32)`, `decimal(20,2)`, `bit`, and nullable `assignee_id`. Describing the INSERT produced no result columns and left the table empty. `sp_describe_undeclared_parameters` suggested `bigint` for one `@customerId`, but rejected repeated optional `@status` with error 11508. It is supplementary inference, not an authoritative parameter-contract source.

For MySQL, the public Promise statement exposed only `statement` and `Promise`; it did not expose parameter or result metadata. The internal statement exposed parameter field types and six result fields after `COM_STMT_PREPARE`, and the prepared INSERT did not insert a row. That confirms a server/protocol fact, not a safe Ashiba responsibility: relying on `connection.connection` would couple a development verifier to mysql2 internals and version behavior.

## Controls

PostgreSQL positive control passed. Existing standalone checking rejected a wrong parameter type, extra parameter, wrong and missing result fields, extra result field, and stale canonical SQL. Its INSERT `RETURNING` contract was described without inserting a row.

SQL Server detected the repeated-parameter limitation and produced a non-executing DML control. It can fail closed for describe errors and result shape/type/nullability disagreement, but this evaluation did not establish a full automatic parameter/TypeScript comparison for the repeated slice.

MySQL retained existing generated-binding missing/extra/stale rejection from the named-parameter path. Public prepare did not provide enough deterministic type metadata to prove wrong parameter or result TypeScript types. Treating that lack as a pass would be unsound; it is recorded as unavailable.

## Driver representations

Database SQL type and driver runtime representation remain separate. The prior native-driver evaluation observed `bigint` as pg `string`, mysql2 default `number`, and mssql `string`; decimal/numeric as pg/mysql2 `string` and mssql `number`. A verifier must not normalize those values cross-driver. Any future DBMS-specific contract would need its own explicit driver profile and must fail closed for unmodelled configuration.

## Cost and ownership

| Candidate | Estimated implementation | New dependency | Risk / maintenance | Decision |
| --- | --- | --- | --- | --- |
| Retain PostgreSQL path | 0 LOC | none | existing PostgreSQL catalog/profile maintenance | keep |
| SQL Server thin result describe | roughly 200–350 LOC plus tests | none | procedure/version/permissions; separate parameter policy and mssql mapping | do not implement |
| SQL Server full parameter/result lane | larger than thin lane | none | repeated-name inference gap invites SQL rewriting or supplied declarations | do not implement |
| MySQL internal prepare oracle | roughly 150–300 LOC initially | none | mysql2 private internals/protocol/configuration behavior | reject |
| MySQL low-level protocol implementation | substantial | likely | parser/protocol/version ownership | reject |

No runtime responsibility is needed or proposed for any candidate: all experiments are development-time and application pools, clients, transactions, and execution stay application-owned.

## Fresh Agent checks

One independent Fresh Agent check was run for each DBMS. The MySQL check reached the same conclusion: no general SQL describe, safe probes are weaker, and an internal protocol path is not a small public ownership boundary. The SQL Server check independently identified `sp_describe_first_result_set` as the result metadata path and `sp_describe_undeclared_parameters` as supplementary inference with repeated-name limitations. Neither introduced an ORM, query builder, runtime parser, unsafe DML execution, or generic abstraction.

## Recommendation

**Recommended next action: keep PostgreSQL-only.**

Do not implement a DBMS Verify lane from this evidence. A future SQL Server result-only experiment may be reconsidered if users specifically value a fail-closed result-shape verifier without automatic parameter proof. Reconsider MySQL only if mysql2 exposes stable public prepare metadata or a supported driver API makes the same information available without internal ownership.

There is no deterministic product blocker. Human review should accept or defer this PostgreSQL-only decision; it should not approve an implementation merely because native metadata can be observed.
