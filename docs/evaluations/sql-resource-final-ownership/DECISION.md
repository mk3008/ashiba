# Final decision

| Surface | Decision | Reason |
| --- | --- | --- |
| `sql-resource snapshot` | **REMOVE** | Persistent generated state has no current application/CI consumer and is not required for any independently valuable invariant. |
| `sql-resource compare` | **REHOME-AS-GENERIC-TOOL** | Fleet-wide PostgreSQL semantic classification can add value beyond Git, but only as a derive-now, no-persistent-artifact generic tool, not Builder Mapper core. |

## What the evidence proves

Snapshot artifacts are not needed for source identity, query membership, named
parameter facts, or compact candidate selection: Arms B/C performed those jobs
without persisted state at 20/300/3000 scale. This rejects the second-scaffold
argument: generating state, detecting its drift, and then retaining the tool
because it detects that drift is not durable ownership proof.

The strongest evidence for a rehomed comparator is the existing live
PostgreSQL mutation matrix: it mechanically classifies unchanged-SQL schema
mutations such as prepare failure and portable type/nullability/driver/
dependency facts that Git cannot prove. The strongest evidence for removal of
snapshot is the absence of any current non-test consumer combined with a
no-artifact operating model that retains ordinary source/parameter review.

## Scope fit and follow-up

Neither snapshot nor compare is Builder Mapper core. Builder Mapper continues
to work as visible SQL -> named compilation/binding -> native driver. Snapshot
is a generated-state lifecycle. A useful PostgreSQL fleet comparator could
serve raw SQL, sqlc, ORM, migration, or data projects; therefore any retained
form is generic rather than Ashiba-owned.

One implementation follow-up may remove the public snapshot command and its
artifact lifecycle. A separate focused generic-tool design may test:

```text
revision + reproducible before DB + after DB
-> temporary contract derivation
-> fail-closed preparation sweep
-> compact affected-query report
-> cleanup
```

It must reproduce the live mutation classifications and demonstrate a real
consumer. If it cannot, remove compare as well. Do not carry forward snapshot
schema compatibility, per-query generated artifacts, or source-hash freshness
as default state.

Evidence strength: **medium**. Reconsider only if an active consumer requires
time-shifted catalog evidence that cannot be reconstructed, or a generic
derive-now comparator proves unsuitable at real database scale.
