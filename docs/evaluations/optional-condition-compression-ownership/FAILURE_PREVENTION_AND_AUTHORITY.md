# Failure Prevention and Final Authority

| Failure / outcome | Compression detects? | Ordinary alternative detects? | Final authority |
| --- | --- | --- | --- |
| stale source/range/replacement coordinate metadata | yes, fail-closed before pg | no equivalent metadata claim | unique early compression proof |
| missing/unused application parameter | named core, not compression | named core | deterministic binding |
| valid optional filter behavior | not proved | integration/live test | application tests |
| wrong optional business meaning | not proved | integration/live test | application tests |
| transaction/result semantics | not proved | integration/live test | application tests |
| planner/performance result | not proved | database performance investigation | application/team |
| runtime rewrite bypass | no | application path/test | application |

## Negative evidence

The Dynamic Mechanism Value Ablation mutated five O-C source/coordinate cases;
all failed as stale before execution. The same record found no O-A/O-B stale
metadata claim because those alternatives intentionally have no generated
coordinate contract. In fresh repairs, O-C was first detector in two of four
runs; ordinary tests were first detector in the other two. All O-A/O-B repairs
became green with ordinary tests.

This establishes a real early-proof difference. It does not establish that the
proof changes final behavioral correctness or production failure incidence.

## Decision implication

Losing the early stale-coordinate failure is an intentional trade-off. The
replacement retains visible nullable guards or visible application query
variants, named binding safety, and application/integration/live tests. No
claim is made that tests are equivalent to coordinate freshness; they detect at
a later behavioral boundary.
