# Debug Visibility Pattern

The Support Inbox demo has two visibility surfaces:

- application logging at the PostgreSQL adapter boundary
- the browser-only Live Query Console used by the demo page

They have different safety rules. The application logger should be safe by default. The demo console may show more detail because it is a local adoption demo whose purpose is to make the SQL execution shape visible.

## What To Log By Default

Production-oriented logs should identify the query without storing sensitive data.

Recommended default fields:

- `phase`: `start`, `end`, or `error`
- `level`: `info` or `error`
- `service`: stable application/service name
- `pid`: process ID for local process correlation
- `requestId`: one HTTP request correlation ID
- `executionId`: one SQL execution correlation ID, shared by its `start`, `end`, or `error` events
- `sqlId` / `queryId`: stable identifiers from query metadata
- `sqlPath`: the source SQL file path for local/review lookup
- `orderedNames`: named parameter order, without values
- `parameterSummary`: parameter names and placeholder positions, without values
- `elapsedMs`
- `durationBucket`
- `rowCount`
- `warnings`
- normalized error metadata

Avoid these fields in default logs:

- full source SQL text
- full compiled SQL text
- unmasked parameter values
- request bodies, headers, customer names, emails, message bodies, or free-text search values

The source SQL can be recovered from `sqlId`, `queryId`, or `sqlPath`, so normal logs do not need to store the full SQL body.

Use `requestId` and `executionId` together:

- `requestId` groups every SQL call made while rendering one HTTP request.
- `executionId` pairs one SQL call's `start` event with its `end` or `error` event.
- `pid` helps local debugging when multiple dev servers or workers are running.

Do not rely on timestamp ordering alone. Servers handle concurrent requests, and log lines from different requests can interleave.

## Parameter Values

Ashiba SQL files use named parameters, and the PostgreSQL adapter emits `orderedNames`. This is enough to understand which named parameters were bound to `$1`, `$2`, and so on.

Parameter values are useful during local debugging, but they are also the highest leakage risk. Use this policy:

- production: log parameter names, not values
- staging: log values only behind an explicit, short-lived debug flag
- local/demo: values may be shown when the developer explicitly opts in

In this example, `src/adapters/logger/sqlLogger.ts` logs IDs, path, timing, row count, and parameter names by default. It also logs `parameterSummary`, which shows which named parameters were actually bound and which placeholders they occupied. It only includes SQL text or raw params when extra local environment flags are enabled.

When `ASHIBA_DEMO_SQL_LOG=1` is set, the example writes JSON Lines to `.logs/sql.log` by default. This makes the log visible even when an AI agent or another process owns the terminal that started the dev server.

Useful local flags:

- `ASHIBA_DEMO_SQL_LOG=1`: enable SQL execution logging
- `ASHIBA_DEMO_SQL_LOG_FILE=path/to/sql.log`: override the log file path
- `ASHIBA_DEMO_SQL_LOG_CONSOLE=0`: write only to the file, not stdout
- `ASHIBA_DEMO_SQL_LOG_SQL_TEXT=1`: include compiled SQL text
- `ASHIBA_DEMO_SQL_LOG_PARAMS=1`: include raw parameter values and masked parameters

Watch the log from another terminal:

```powershell
Get-Content examples/hono-pg-support-inbox/.logs/sql.log -Wait
```

The web demo uses `includeUnmaskedParamsInEvents: true` only inside `tickets.presenter.ts` so the Live Query Console can show bound parameter values. Keep that behavior local to the demo/debug surface, not in feature code.

## Live Query Console

The Live Query Console is a teaching surface, not the production logging policy.

It intentionally shows:

- the SQL file path
- compiled SQL after optional-condition compression and safe sort
- placeholder-to-name mapping
- parameter values for local inspection
- selected safe sort keys
- stable suffix ordering
- elapsed time and row count when available

This helps reviewers confirm that dynamic filters and dynamic sort are still backed by visible SQL, not hidden query-builder logic.

## Logger Wiring

Keep logger wiring at the SQL client adapter boundary:

```text
query -> feature -> sqlClient -> logger
```

Feature code should receive `FeatureQueryExecutor`. It should not import `pg`, pino, winston, OpenTelemetry, or adapter observer code directly.

The example wiring is:

- `src/adapters/pg/pool.ts` creates the Ashiba PostgreSQL adapter and provides the observer.
- `src/adapters/logger/sqlLogger.ts` is the application-owned logging hook.
- `src/adapters/web/modules/support-inbox/tickets/view/tickets.presenter.ts` overrides the observer for the local demo console.

## Library Choice

This example intentionally does not choose a production logger. Reasonable choices are:

- pino for structured JSON application logs
- OpenTelemetry for traces, spans, metrics, and correlation
- winston if the application already standardizes on it
- console only for a small demo or local development

Ashiba should not own this choice. The adapter observer should hand structured events to the application's existing logging and telemetry boundary.

## Storage Choice

Prefer short retention and structured storage:

- local/demo: browser memory, terminal output, or `.logs/sql.log`
- application logs: JSON logs collected by the existing platform
- metrics: time-series storage for latency, error rate, and row count summaries
- traces: OpenTelemetry collector or the organization's existing tracing backend

Do not store raw SQL text and raw parameter values in long-lived production logs unless a human security decision explicitly allows it.

## Performance And Alerts

The observer emits `elapsedMs` and `rowCount`, so application code can add performance monitoring without parsing SQL.

Useful alerts:

- error rate by `sqlId`
- p95 / p99 latency by `sqlId`
- unexpected high row count by `sqlId`
- repeated adapter warnings, especially stale metadata or unsafe runtime input
- missing `end` / `error` event for a `start` event after a timeout window
- repeated slow executions from the same `requestId`

Keep alert policy outside Ashiba. Ashiba supplies query identity and execution metadata; the application decides thresholds, sampling, retention, and escalation.

## Operational Defaults

For a production application, decide these outside Ashiba:

- log level mapping: normal SQL completion is `info`, adapter or driver failure is `error`, slow query may be `warn`
- retention: short for debug logs, longer for aggregated metrics
- rotation: size-based or time-based rotation for file logs
- sampling: sample high-volume successful queries, keep all errors and slow queries
- access control: raw logs should be restricted because even names and row counts can reveal business activity
- redaction review: treat free-text filters, emails, names, customer IDs, message bodies, and request headers as sensitive by default
- clock/correlation: prefer ISO timestamps plus request/execution IDs; do not depend on timestamp ordering only
- environment split: local/demo can show more, production should default to safe summaries

## Reuse Checklist

When adding another demo or application screen:

1. Give each query stable metadata: `sqlId`, `queryId`, and `sqlPath`.
2. Generate or propagate a request correlation ID at the inbound adapter boundary.
3. Wire the adapter observer at the application SQL client boundary.
4. Log query identity, request ID, execution ID, timing, row count, warnings, named parameter order, and parameter summary by default.
5. Keep SQL text and raw parameter values behind local/debug-only opt-ins.
6. If the screen is an adoption demo, add a visible inspection panel that explains the dynamic behavior.
7. Cover the route with tests that assert the important SQL shape when the panel is part of the demo value.
