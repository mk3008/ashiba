# Layered ticket app

## Exact task prompt

Build a runnable minimal LAYERED PostgreSQL ticket app in a clean directory using only packed Ashiba tarballs and this packet. Implement canonical `.sql`, model-gen binding metadata, `bindNamedParameters`, native `pg`, finite source-controlled sort, list optional filter/paging/get/assign+audit transaction/rollback test. Layered placement: SQL/generated access layer; application service/use case owns mapping and transaction; native pool adapter application-owned. DDL: `tickets(id bigserial PK, subject text, status text, assignee_id bigint nullable, created_at timestamptz)`, `ticket_events(id bigserial, ticket_id bigint, kind text, created_at timestamptz)`. Acceptance: list optional status/assignee filters, joined audit count/multiple columns, limit/offset; get; assign with audit in native transaction; injected audit error rolls back; sort `createdAt`/`subject` asc|desc with id stable tie; hostile input bound, not SQL interpolated; binder missing/unused rejection. Package tarballs only for Ashiba; no workspace/file deps; no ORM/migration/scaffold/safe-sort runtime.

## Scope

This directory is intentionally self-contained. The SQL is canonical and generated metadata is checked into `src/generated`; the application owns its domain mapping, transaction boundaries, and native `pg` pool adapter.
