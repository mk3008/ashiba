# Arm C — derive-now semantic comparison

Arm C retains no committed artifact. It derives the relevant before/after facts
in memory from the two SQL inputs and the named-parameter compiler:

```text
before revision + before database
after revision/worktree + after database
-> temporary/in-memory facts
-> compact semantic report
-> cleanup
```

The bounded harness directly compiled canonical SQL in memory and detected the
semantic predicate change plus the parameter-set change in all 20/300/3000
fleets. It produced the same two affected candidates as Arms A and B without
persisting a snapshot. This proves the no-artifact operating shape for source
and parameter facts; it does **not** by itself reproduce PostgreSQL catalog,
result, dependency, or prepare evidence.

Those PostgreSQL facts are the meaningful residual value. A future generic
tool would need reproducible before/after databases, derive the contracts
temporarily, fail closed for preparation errors, and emit the compact report.
It must not inherit the current committed per-query/fleet schema by default.

If that focused generic implementation cannot reproduce the live mutation
matrix, compare should be removed rather than keeping snapshot artifacts merely
to preserve it.
