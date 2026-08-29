# Driver Surface Final Reduction — Self Review

## Source request

Implement the already-decided removal of ordinary PostgreSQL adapter
preparation/execution, optional-condition compression, runtime safe sort, and
the shared driver-adapter core while retaining the Golden Path, named binding,
and the standalone PostgreSQL contract.

## Review cycle 1 — consistency

Reviewed production consumers, generated artifacts, tests, CLI discovery,
current docs, migration guidance, package references, and the detached Transfer
consumer.

Findings:

- **Resolved:** the list query still described a generated mapper boundary.
  Its canonical and generated SQL snapshots now describe an application view
  and application-owned types.
- **Resolved:** `query optional` registration, catalog entries, rewriter,
  coordinate metadata, model-gen fields, and resource snapshot fields were
  removed together.
- **Intentional historical residue:** old adapter/compression terminology in
  historical dogfooding, planning, exercises, Transfer documents, and prior
  evaluations is preserved as evidence; the Support Inbox exercise index marks
  those exercises historical rather than current runtime guidance.
- **Intentional retained surface:** `sourceHash` remains in generated binding
  metadata for build-time freshness and retained consumer identity. The generic
  ordinary-execution runtime gate is removed.

## Review cycle 2 — human acceptance

The reviewable boundary is explicit:

- application code binds `bindingMetadata.bindings.postgres` with
  `bindNamedParameters` and invokes native `pg`;
- optional filters are visible nullable guards;
- sort input is selected from an application-owned finite map and represented
  by reviewed SQL cases, never concatenated request text;
- application-owned logging masks normal parameter events and only emits raw
  parameters when its explicit opt-in is selected;
- PostgreSQL contract commands remain separate from runtime preparation.

Evidence includes standard verification, direct Support Inbox DB-backed tests,
the Ticket Queue native reference and contracts, CLI PostgreSQL live tests,
Transfer's explicit verification, and a CRLF-only SQL drift check.

## Triage

| Finding | Status | Rationale |
| --- | --- | --- |
| Stale generated-mapper wording | resolved | Current canonical/generated snapshot wording now matches application ownership. |
| Historical adapter terminology | accepted historical evidence | It is not current product promotion and is deliberately retained. |
| Compression stale-coordinate early proof | accepted product trade-off | The completed ownership evaluation decided removal; application/integration/live tests are now the authority. |
| Ticket Queue compose network creation | environment note | Docker's address-pool exhaustion was worked around with isolated temporary PostgreSQL databases; the native reference and contract verification passed. |

## Review readiness

**Ready for human review.** No unresolved implementation blocker remains.

## Next human decision

Review whether the intentional breaking removal and migration guidance are
acceptable. Do not merge based on this document alone; CI and human review are
the next gates.
