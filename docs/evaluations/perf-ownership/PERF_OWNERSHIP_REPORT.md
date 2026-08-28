# Perf Durable Ownership Evaluation

## Problem and method

Performance investigation is useful. This evaluation asks whether Ashiba should
permanently own its current performance commands, scenario directory, evidence
JSON, and report JSON formats.

The same PostgreSQL 18 task ran in two arms against a temporary 100,000-row
`perf_tickets` table. The visible canonical query filtered one customer and
returned at most 100 rows. Baseline used no customer index; the candidate added
`perf_tickets_customer_id_id_idx` only inside the temporary container.

Arm A used current Ashiba perf commands plus a native `pg` measurement script.
Arm B did not call any perf command or use any perf artifact format; it used
ordinary native `pg`, `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`, and plain JSON.

## Observed result

Both arms found the same useful database fact: baseline used a sequential scan
and the sandbox index changed the access path to a bitmap heap/index scan. Arm
A median changed from 5.943 ms to 1.356 ms; Arm B observed 5.360 ms to 1.236 ms.

Ashiba perf did not execute the query, collect a duration, collect a plan, or
verify plan provenance. `scenario measure` accepted a fabricated 0.01 ms value
and unrelated `params.json` as its explain path. It also accepted evidence after
referenced SQL changed. `report diff` compared arbitrary duration fields from
reports with different query/dataset fields, and could not compare the
measurement JSON produced by `scenario measure`.

Missing and unused parameter rejection worked, but it overlaps the existing
named-parameter core; it is not unique performance value.

## Classification

See [PERF_DECISION.md](./PERF_DECISION.md):

```text
REMOVE-WITH-MIGRATION-NOTE
```

The current workflow provides generation convenience and policy prose, but no
unique deterministic evidence-integrity or failure-prevention guarantee that
justifies permanent command and artifact ownership. Performance investigation
continues as application-owned native database work.

## Limit

Arm B was not a separate fresh agent: the same evaluator had already read perf
implementation. It is reconstructibility evidence, not an independent
clean-room benchmark. It still shows that no perf command or format was needed
to produce reviewable evidence.
