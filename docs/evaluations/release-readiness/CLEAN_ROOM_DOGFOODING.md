# Clean-room dogfooding

Two separate fresh-agent clean rooms received only packed Ashiba packages,
ordinary dependencies, frozen DDL/business acceptance, a consumer AGENTS.md,
and an architecture prompt. They did not receive Ashiba source, existing
examples, evaluations, or another candidate's output.

The layered candidate remains the previously accepted TypeScript clean-room
result. The original VSA evidence did not meet the release requirement because
its application was `.mjs` and `tsc` did not check JavaScript. It is superseded
by the new clean-room TypeScript rerun documented in
[VSA_TYPESCRIPT_RERUN.md](VSA_TYPESCRIPT_RERUN.md).

The new VSA candidate produced visible SQL, generated metadata, named binding,
finite reviewed sort choices, native `pg`, and a transaction with audit rollback
as strict TypeScript on its initial clean-room attempt. The runner-owned
PostgreSQL oracle then independently passed filtering, all four reviewed sort
pairs, pagination, get, hostile-value binding, missing/unused binding rejection,
committed assignment, and rollback after a database-injected audit failure.

The VSA rerun needed no repair, retry, or escalation. Token and credit telemetry
were unavailable; the orchestration ledger records the Luna route, purpose, and
outcome without inferred usage.
