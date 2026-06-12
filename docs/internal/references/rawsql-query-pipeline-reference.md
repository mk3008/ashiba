# rawsql-ts Query Pipeline Reference

This document preserves historical design notes from the local `rawsql-ts` / `ztd-cli` worktree.

It is not product documentation, not a committed Ashiba API contract, and not a request to import the old `ztd-cli` runtime. It exists because the old query pipeline and scalar-query experiments may be removed during the Ashiba migration, while the design evidence is still useful for future Ashiba extension planning.

## Source Snapshot

Observed local source:

- `C:\Users\mssgm\CodexApp\worktrees\rawsql-ts-812-create-transfer-setting\packages\ztd-cli\src\query\planner.ts`
- `C:\Users\mssgm\CodexApp\worktrees\rawsql-ts-812-create-transfer-setting\packages\ztd-cli\src\query\execute.ts`
- `C:\Users\mssgm\CodexApp\worktrees\rawsql-ts-812-create-transfer-setting\packages\ztd-cli\src\query\scalarFilterAnalysis.ts`
- `C:\Users\mssgm\CodexApp\worktrees\rawsql-ts-812-create-transfer-setting\docs\dfd\batch\business\transfer-execution.md`
- `C:\Users\mssgm\CodexApp\worktrees\rawsql-ts-812-create-transfer-setting\docs\dfd\batch\business\transfer-execution\process\transfer-execution-process.md`
- `C:\Users\mssgm\CodexApp\worktrees\rawsql-ts-812-create-transfer-setting\packages\transfer\src\libraries\sql\sql-client.ts`
- `C:\Users\mssgm\CodexApp\worktrees\rawsql-ts-812-create-transfer-setting\packages\transfer\src\adapters\pg\sql-client.ts`

The rawsql-ts worktree appeared to be in a non-clean parent/worktree state during this review, so Ashiba should treat these paths as read-only historical references.

## Preserved Concepts

### Query Pipeline Plan

The old `ztd-cli` pipeline planner models query execution as a deterministic plan derived from SQL structure plus explicit metadata.

Preserved shape:

```ts
type QueryPipelineStepKind =
  | 'materialize'
  | 'materialize-returning'
  | 'final-query';

type QueryPipelineMetadata = {
  material?: string[];
  scalarFilterColumns?: string[];
};

type QueryPipelineStep = {
  step: number;
  kind: QueryPipelineStepKind;
  target: string;
  depends_on: string[];
};
```

Important properties:

- `material` is an explicit metadata list of CTE names to materialize.
- `scalarFilterColumns` is an explicit metadata list for scalar-filter binding.
- CTE dependencies are analyzed before execution.
- The final relation is represented as a separate `final-query` step.
- `materialize-returning` exists for DML-returning CTEs.

This supports Ashiba's current direction: structural analysis belongs to dev-time tooling and generated metadata, not to production driver adapters.

### Query Pipeline Execution

The old executor ran the pipeline inside one DB session and reused stage outputs.

Preserved execution stages:

```ts
type QueryPipelineExecutionStepKind =
  | 'materialize'
  | 'materialize-returning'
  | 'scalar-filter-bind'
  | 'final-query';
```

Observed behavior:

- Open one session for the whole pipeline.
- Build stage SQL from the source query and the current materialization boundary.
- Run `scalar-filter-bind` subqueries before the stage that needs their values.
- Materialized CTEs are created as temporary tables.
- The final query runs after prior materialized stages.
- Temporary tables are cleaned up in reverse creation order.

Ashiba should not copy this runtime as-is. The important retained design point is the execution identity model: a single user-visible query can expand into multiple SQL executions, each of which needs a stage identity.

### Scalar Filter Candidate Analysis

The old scalar analysis detects non-correlated scalar subqueries in `WHERE` comparisons.

Preserved constraints:

- Candidate detection is AST-based.
- It focuses on comparison expressions.
- The scalar subquery must project exactly one usable column.
- Correlated subqueries are rejected.
- The result is a stable list of candidate column names.

This is relevant to future scalar-query expansion. The production driver adapter should not rediscover these facts with regular expressions. It should receive generated, drift-checked metadata from Ashiba tooling.

### Transfer Execution Context

The old transfer package and docs contain a related idea: a process-level execution context.

Preserved analogy:

- `Transfer Run` acts as an execution argument record and process header.
- Work items and transfer outputs are associated back to that run context.
- Generated SQL status/body/error fields exist as reviewable artifacts, not invisible runtime behavior.

For Ashiba logging, this supports a distinction between:

- `requestId`: inbound adapter/request correlation.
- `executionId`: one concrete DB execution attempt.
- `pipelineRunId`: one expanded query pipeline run.
- `stepName`: one human-readable stage inside that pipeline.

## Logging Metadata Implications

Current Ashiba demo logging can identify a direct query with `sqlId`, `requestId`, and `executionId`.

Future pipeline or scalar-query extensions should not overload `sqlId` to mean every stage. A single source SQL can produce multiple DB executions. The log metadata should be able to represent that shape without storing raw SQL text or raw parameter values.

Reference shape:

```ts
type QueryExecutionStageMetadata = {
  rootSqlId?: string;
  sqlId?: string;
  requestId?: string;
  executionId?: string;
  pipelineRunId?: string;
  stepName?: string;
  stepIndex?: number;
  stepKind?:
    | 'direct-query'
    | 'materialize'
    | 'materialize-returning'
    | 'scalar-filter-bind'
    | 'final-query';
  stepTarget?: string;
  dependsOn?: string[];
};
```

Suggested interpretation:

- `rootSqlId`: the customer-reviewed source SQL identity.
- `sqlId`: the execution identity used by the current query object; for direct queries this may equal `rootSqlId`.
- `pipelineRunId`: groups every SQL execution produced by one expanded source query.
- `executionId`: pairs one concrete `start` event with its `end` or `error` event.
- `stepName`: stable human-facing name, such as `materialize latest_message`, `bind customer_id`, or `final query`.
- `stepKind`: machine-readable category.
- `stepTarget`: CTE name, scalar column, or `FINAL_QUERY`.
- `dependsOn`: names of earlier stages that must run first.

For the Support Inbox demo, direct execution can omit these future fields. A future expanded query should include them in debug events and file logs so a reviewer can answer:

- Which visible SQL asset was expanded?
- Which stage ran?
- Which DB execution failed or became slow?
- Which stage produced the parameter consumed by a later stage?

## Boundary Notes For Ashiba

Ashiba should preserve the philosophical split:

- `rawsql-ts` core owns AST parsing and SQL structural primitives.
- `@ashiba-ts/cli` owns dev-time analysis, generated metadata, drift checks, and review artifacts.
- Driver adapters own execution, named binding, safe sort insertion, optional-condition compression from trusted metadata, and observer events.
- Driver adapters should not contain SQL AST analysis or regex-based query planning.

If future pipeline/scalar support needs runtime execution, it should live in an explicit extension package or customer-owned adapter boundary. It should not silently turn Ashiba core into an ORM runtime or hidden query planner.

## What Not To Preserve

Do not preserve these as product commitments:

- the exact old `ztd-cli` command names
- the exact temp-table implementation
- the old scalar-binding runtime implementation
- the old transfer package directory structure
- any assumption that pipeline execution belongs in the PostgreSQL driver adapter

The durable asset is the review model: SQL structure is analyzed before runtime, expanded execution has named steps, and logs can correlate a user-visible SQL asset to every concrete DB execution without leaking sensitive data.
